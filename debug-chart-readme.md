# Debug Chart Extension for Visual Studio Code

## Overview

Debug Chart is a Visual Studio Code extension that allows you to visualize debug values from watch variables in real-time charts. This extension enhances your debugging experience by providing a graphical representation of variable changes during program execution.

## Features

- Chart debug values from watch variables
- Support for multiple chart types: line, spline, bar, column, and pie
- Real-time updates as you step through your code
- Customizable watch variables
- Refresh button to manually update the chart
- Export chart data and images

## Installation

1. Open Visual Studio Code
2. Go to the Extensions view (Ctrl+Shift+X)
3. Search for "Debug Chart"
4. Click "Install" to install the extension
5. Reload Visual Studio Code when prompted

## Usage

1. Start a debug session in Visual Studio Code
2. Run the "Debug Chart" command from the Command Palette (Ctrl+Shift+P)
3. Enter the variable names you want to watch, separated by commas
4. Select the chart type you prefer
5. The chart will appear in a new panel and update as you step through your code

## Configuration

You can configure the extension by adding the following to your `settings.json`:

```json
"vscode-debug-chart.watchVariables": [
  "variableName1",
  "variableName2"
]
```

This will set default variables to watch when you start the Debug Chart.

## Commands

- `vscode-debug-chart.showChart`: Opens the Debug Chart panel and prompts for variables to watch

## Requirements

- Visual Studio Code version 1.60.0 or higher

## Known Issues

Please report any issues you encounter on the [GitHub repository](https://github.com/your-username/vscode-debug-chart/issues).

## Contributing

Contributions are welcome! Please fork the repository and submit pull requests with your improvements.

## License

This extension is released under the [MIT License](LICENSE).

## Credits

Debug Chart extension is developed by mmoreno.

Icon made by [Freepik](https://www.freepik.com) from [www.flaticon.com](https://www.flaticon.com/).

## Changelog

### 0.0.2
- Initial release of Debug Chart extension

---

Happy debugging with charts! 📊🐛
