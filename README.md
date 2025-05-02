# Tasmota Smart Meter Applet

A Cinnamon applet that displays real-time power consumption data from Tasmota-based smart meters. The applet shows current power usage with a visual indicator for power consumption (red) or production (green).

## Tested Devices
- WattWaechter Smart Meter devices running Tasmota firmware
- Tested with Tasmota firmware version 14.x and above
- Tested on Cinnamon desktop environment 6.4+

## Features
- Real-time power monitoring
- Visual indication for power consumption/production
- Configurable refresh interval
- Support for European number format
- Customizable date/time format
- Detailed tooltip showing:
  - Current power consumption/production
  - Total energy consumption
  - Supply/Export energy
  - Voltage
  - Current
  - Frequency
  - Last update timestamp

## Installation
1. Download or clone this repository
2. Copy the folder `tasmota-smart-meter@gumida` to `~/.local/share/cinnamon/applets/`
3. Enable the applet in Cinnamon Settings → Applets

## Configuration
Configure the following settings in the applet configuration:
- **API Endpoint**: Your Tasmota device's status endpoint (e.g., `http://192.168.1.1/cm?cmnd=Status%208`)
- **JSON Response Root Key**: The root key containing energy data (default: `StatusSNS`)
- **Refresh Interval**: How often to fetch new data (in seconds)
- **Number Format**: Choose between European (1.234,56) or International (1,234.56) format
- **Date/Time Format**: Custom format for timestamp display

See `doc/example.json` for an example of the expected JSON response format from your device.

## Requirements
- Cinnamon desktop environment
- Tasmota-based smart meter device
- Network connectivity to the smart meter

## Limitations
- Currently only tested with WattWaechter devices
- Requires Tasmota firmware
- Device must be accessible via HTTP
- JSON response structure must contain power/energy data

## Troubleshooting
If the applet shows:
- "Config Err": Check your API endpoint and JSON key settings
- "Err": Check if the device is accessible
- "No Data": Verify the JSON response structure
- "JSON?": The response is not valid JSON
- "No Power": Power value not found in the expected location

## Contributing
Feel free to submit issues and pull requests.

## License
This project is licensed under the MIT License. See the LICENSE file for details.

## Credits
- Meter icons created by [Smashicons - Flaticon](https://www.flaticon.com/free-icons/meter)

## Author
- gumida
