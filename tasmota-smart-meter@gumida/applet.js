const Applet = imports.ui.applet;
const Mainloop = imports.mainloop;
const Lang = imports.lang;
const Settings = imports.ui.settings;
const Soup = imports.gi.Soup;
const ByteArray = imports.byteArray;
const GLib = imports.gi.GLib;

// Initialize HTTP session based on Soup version
let _httpSession;
if (Soup.MAJOR_VERSION >= 3) {
    _httpSession = new Soup.Session();
} else {
    _httpSession = new Soup.SessionAsync();
    Soup.Session.prototype.send_and_read_async = function(msg, priority, cancellable, callback) {
        this.send_message(msg);
    }
}

class TasmotaSmartMeterApplet extends Applet.TextIconApplet {
    constructor(metadata, orientation, panel_height, instance_id) {
        super(orientation, panel_height, instance_id);

        this.settings = new Settings.AppletSettings(this, metadata.uuid, instance_id);
        this.set_applet_tooltip(_("Click to refresh"));
        this.set_applet_label("...");
        this.lastUpdate = null;

        // Bind settings
        this.settings.bind("api-endpoint", "apiEndpoint", this._onSettingsChanged);
        this.settings.bind("refresh-interval", "refreshInterval", this._onSettingsChanged);
        this.settings.bind("json-key", "jsonKey", this._onSettingsChanged);
        this.settings.bind("datetime-format", "datetimeFormat", this._onSettingsChanged);
        this.settings.bind("use-eu-format", "useEuFormat", this._onSettingsChanged);

        this._updateLoop();
    }

    _onSettingsChanged() {
        this._removeTimeout();
        this._updateLoop();
    }

    _updateLoop() {
        this._fetchData();
        this._timeout = Mainloop.timeout_add_seconds(this.refreshInterval, Lang.bind(this, this._updateLoop));
    }

    _formatNumber(value) {
        let absValue = Math.abs(value);
        let formatted = absValue.toFixed(0);
        
        if (this.useEuFormat) {
            formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        } else {
            formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
        return formatted + " W";
    }

    _fetchData() {
        if (!this.apiEndpoint || !this.jsonKey) {
            global.log("Tasmota Smart Meter: Missing configuration - API endpoint or JSON key");
            this.set_applet_label("⚠️ Config");
            this.set_applet_tooltip(_("Please configure API endpoint and JSON key in settings"));
            return;
        }

        let message = Soup.Message.new('GET', this.apiEndpoint);
        if (!message) {
            global.logError("Tasmota Smart Meter: Failed to create HTTP request");
            this.set_applet_label("⚠️ Error");
            return;
        }

        _httpSession.send_and_read_async(message, Soup.MessagePriority.NORMAL, null, (session, result) => {
            let statusCode = Soup.MAJOR_VERSION >= 3 ? message.get_status() : message.status_code;
            if (!message || statusCode !== 200) {
                global.logError("Tasmota Smart Meter: HTTP request failed with status " + statusCode);
                this.set_applet_label("⚠️ Network");
                this.set_applet_tooltip(_("Error fetching data from device"));
                return;
            }

            try {
                let bytes = _httpSession.send_and_read_finish(result);
                let rawResponse = Soup.MAJOR_VERSION >= 3 
                    ? ByteArray.toString(ByteArray.fromGBytes(bytes))
                    : ByteArray.toString(bytes);

                let response = JSON.parse(rawResponse);
                let rootData = this.jsonKey ? response[this.jsonKey] : response;
                
                let energy = rootData?.ENERGY || rootData?.energy || rootData?.power || rootData;

                if (!energy) {
                    global.logError("Tasmota Smart Meter: No energy data found in response");
                    this.set_applet_label("⚠️ Data");
                    this.set_applet_tooltip(_("No energy data found in device response"));
                    return;
                }

                let powerValue = energy.Power ?? energy.power ?? energy.actual_power ?? energy.current_power;
                
                if (powerValue !== undefined) {
                    let formattedValue = this._formatNumber(powerValue);
                    formattedValue = powerValue < 0 ? "🟢 -" + formattedValue : "🔴 " + formattedValue;
                    
                    this.lastUpdate = new Date();
                    this.set_applet_label(formattedValue);
                    
                    let formattedDate = GLib.DateTime.new_from_unix_local(this.lastUpdate.getTime() / 1000)
                        .format(this.datetimeFormat);
                    
                    let tooltipText = [];
                    
                    const formatNumber = (value, decimals = 0) => {
                        if (value === undefined) return undefined;
                        let formatted = value.toFixed(decimals);
                        return this.useEuFormat
                            ? formatted.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                            : formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    };

                    let fields = {
                        "Power": energy.Power ?? energy.power ?? energy.actual_power,
                        "Total": energy.Total ?? energy.total ?? energy.total_energy,
                        "Supply": energy.Supply ?? energy.supply ?? energy.exported_energy,
                        "Voltage": energy.Voltage ?? energy.voltage,
                        "Current": energy.Current ?? energy.current,
                        "Freq": energy.Freq ?? energy.frequency
                    };

                    if (fields.Power !== undefined) tooltipText.push(_("Power: ") + formatNumber(fields.Power) + " W");
                    if (fields.Total !== undefined) tooltipText.push(_("Total: ") + formatNumber(fields.Total, 3) + " kWh");
                    if (fields.Supply !== undefined) tooltipText.push(_("Supply: ") + formatNumber(fields.Supply, 3) + " kWh");
                    if (fields.Voltage !== undefined) tooltipText.push(_("Voltage: ") + formatNumber(fields.Voltage, 1) + " V");
                    if (fields.Current !== undefined) tooltipText.push(_("Current: ") + formatNumber(fields.Current, 2) + " A");
                    if (fields.Freq !== undefined) tooltipText.push(_("Frequency: ") + formatNumber(fields.Freq, 1) + " Hz");
                    tooltipText.push(_("Last updated: ") + formattedDate);
                    
                    this.set_applet_tooltip(tooltipText.join("\n"));
                } else {
                    global.logError("Tasmota Smart Meter: No power value in response");
                    this.set_applet_label("⚠️ Power");
                    this.set_applet_tooltip(_("No power value found in device response"));
                }
            } catch (e) {
                global.logError("Tasmota Smart Meter: JSON parsing error: " + e.toString());
                this.set_applet_label("⚠️ JSON");
                this.set_applet_tooltip(_("Error parsing device response"));
            }
        });
    }

    on_applet_clicked(event) {
        this._fetchData();
    }

    on_applet_removed_from_panel() {
        this._removeTimeout();
    }

    _removeTimeout() {
         if (this._timeout) {
            Mainloop.source_remove(this._timeout);
            this._timeout = null;
        }
    }
}

function main(metadata, orientation, panel_height, instance_id) {
    return new TasmotaSmartMeterApplet(metadata, orientation, panel_height, instance_id);
}
