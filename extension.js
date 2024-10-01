// extension.js
const vscode = require('vscode');

let panels = [];

function activate(context) {
  console.log('Debug Chart extension is now active');

  let disposable = vscode.commands.registerCommand('vscode-debug-chart.showChart', async function () {
    const input = await vscode.window.showInputBox({
      prompt: "Enter variable names to watch (comma-separated)",
      placeHolder: "e.g., x, y, z"
    });

    if (input) {
      const chartType = await vscode.window.showQuickPick(['line', 'spline', 'bar', 'column', 'pie'], {
        placeHolder: 'Select chart type'
      });

      if (chartType) {
        createNewChart(input, chartType);
      }
    }
  });

  context.subscriptions.push(disposable);

  // Add debug event listeners
  vscode.debug.onDidStartDebugSession(() => {
    console.log('Debug session started');
  });

  vscode.debug.onDidTerminateDebugSession(() => {
    console.log('Debug session ended');
  });

  vscode.debug.onDidChangeBreakpoints(() => {
    console.log('Breakpoints changed');
  });

  vscode.debug.onDidReceiveDebugSessionCustomEvent((e) => {
    console.log('Debug custom event received:', e.event, e.body);
    if (e.event === 'stopped') {
      console.log('Debugger stopped, reason:', e.body.reason);
      updateAllCharts();
    }
  });
}

function getWebviewContent(chartType) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Debug Chart</title>
        <script src="https://code.highcharts.com/highcharts.js"></script>
        <script src="https://code.highcharts.com/modules/boost.js"></script>
        <script src="https://code.highcharts.com/modules/exporting.js"></script>
        <script src="https://code.highcharts.com/modules/export-data.js"></script>
        <script src="https://code.highcharts.com/modules/accessibility.js"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
        <style>
            body, html {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                overflow: hidden;
            }
            #container {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
            }
            #refreshButton {
                position: absolute;
                top: 10px;
                left: 10px;
                z-index: 1000;
                background-color: #007acc;
                color: white;
                border: none;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                transition: background-color 0.3s;
            }
            #refreshButton:hover {
                background-color: #005999;
            }
        </style>
    </head>
    <body>
        <button id="refreshButton"><i class="fas fa-sync-alt"></i></button>
        <div id="container"></div>
        <script>
            const vscode = acquireVsCodeApi();

            let chart;
            let chartOptions = {
                chart: {
                    type: '${chartType}',
                    animation: false,
                    height: '100%',
                    zoomType: 'x',
                    panning: true,
                    panKey: 'shift'
                },
                boost: { useGPUTranslations: true, usePreAllocated: true},
                title: { text: undefined },
                xAxis: { 
                    title: { text: undefined },
                    labels: { enabled: true },
                    tickWidth: 1,
                    lineWidth: 1
                },
                yAxis: { 
                    title: { text: undefined },
                    labels: { enabled: true },
                    gridLineWidth: 1
                },
                tooltip: {
                    formatter: function() {
                        if (this.series.type === 'pie') {
                            return '<b>' + this.point.name + '</b>: ' + this.y.toFixed(2);
                        } else {
                            return '<b>' + this.series.name + '[' + this.x + ']</b>:' + this.y;
                        }
                    }
                },
                legend: {
                    enabled: true,
                    layout: 'vertical',
                    align: 'right',
                    verticalAlign: 'middle'
                },
                plotOptions: {
                    series: {
                        animation: false
                    },
                    pie: {
                        allowPointSelect: true,
                        cursor: 'pointer',
                        dataLabels: {
                            enabled: true,
                            format: '<b>{point.name}</b>: {point.percentage:.1f} %'
                        }
                    }
                },
                series: [],
                exporting: {
                    enabled: true
                }
            };

            function createChart() {
                chart = Highcharts.chart('container', chartOptions);
            }

            createChart();

            function resizeChart() {
                if (chart) {
                    chart.setSize(window.innerWidth, window.innerHeight);
                }
            }

            window.addEventListener('resize', resizeChart);

            document.getElementById('refreshButton').addEventListener('click', () => {
                vscode.postMessage({ command: 'refresh' });
            });

            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'updateChart':
                        if (chartOptions.chart.type === 'pie') {
                            if (chart.series[0]) {
                                chart.series[0].setData(message.data, false);
                            } else {
                                chart.addSeries({
                                    name: 'Variables',
                                    data: message.data
                                }, false);
                            }
                        } else {
                            message.data.forEach((newSeries, index) => {
                                if (index < chart.series.length) {
                                    chart.series[index].setData(newSeries.data, false);
                                    chart.series[index].update({
                                        name: newSeries.name
                                    }, false);
                                } else {
                                    chart.addSeries(newSeries, false);
                                }
                            });
                            
                            // Remove any extra series
                            while (chart.series.length > message.data.length) {
                                chart.series[chart.series.length - 1].remove(false);
                            }
                        }

                        chart.redraw();
                        break;
                }
            });

            // Initial resize
            resizeChart();
        </script>
    </body>
    </html>
  `;
}

function createNewChart(input, chartType) {
  const panel = vscode.window.createWebviewPanel(
    'debugChart',
    `Debug Chart (${input})`,
    vscode.ViewColumn.Active,
    {
      enableScripts: true
      , retainContextWhenHidden: true
    }
  );
  const watchedVariables = input.split(',').map(v => v.trim());
  
  panel.webview.html = getWebviewContent(chartType);
  panel.webview.onDidReceiveMessage(
    message => {
      switch (message.command) {
        case 'refresh':
          console.log('Refresh button clicked');
          updateChart(panel, watchedVariables, chartType);
          return;
      }
    },
    undefined,
    null
  );
  
  panel.onDidDispose(() => {
    const index = panels.findIndex(p => p.panel === panel);
    if (index > -1) {
      panels.splice(index, 1);
    }
  });
  
  panels.push({ panel, watchedVariables, chartType, dataPoints: {} });
  updateChart(panel, watchedVariables, chartType);

  panel.onDidChangeViewState(e => {
    if (e.webviewPanel.visible) {
      updateChart(panel, watchedVariables, chartType);
    }
  });

}

async function getDebugValues(watchedVariables) {
  const session = vscode.debug.activeDebugSession;
  if (!session) {
    return [];
  }

  try {
    const threadsResponse = await session.customRequest('threads');
    if (!threadsResponse || !threadsResponse.threads || threadsResponse.threads.length === 0) {
      console.error('No threads available');
      return [];
    }

    const threadId = threadsResponse.threads[0].id;

    const stackTrace = await session.customRequest('stackTrace', {
      threadId: threadId,
      startFrame: 0,
      levels: 1
    });

    if (!stackTrace || !stackTrace.stackFrames || stackTrace.stackFrames.length === 0) {
      console.error('No stack frames available');
      return [];
    }

    const topFrame = stackTrace.stackFrames[0];

    const scopesResponse = await session.customRequest('scopes', { frameId: topFrame.id });
    if (!scopesResponse || !scopesResponse.scopes || scopesResponse.scopes.length === 0) {
      console.error('No scopes available');
      return [];
    }

    const localScope = scopesResponse.scopes.find(s => s.name === 'Local' || s.name === 'Locals');
    if (!localScope) {
      console.error('No local scope found');
      return [];
    }

    const variablesResponse = await session.customRequest('variables', { variablesReference: localScope.variablesReference });
    if (!variablesResponse || !variablesResponse.variables) {
      console.error('No variables available');
      return [];
    }

    const results = [], dataPoints = [];

    for (const variable of watchedVariables) {
      const foundVariable = variablesResponse.variables.find(v => v.evaluateName === variable);
      if (foundVariable) {
        if (foundVariable.variablesReference) {
          // This is an array or complex object, we need to fetch all its elements
          const arrayValues = await fetchAllArrayElements(session, foundVariable.variablesReference);
          results.push({ name: variable, values: arrayValues });
          dataPoints[variable] = arrayValues;
        } else {
          const value = parseFloat(foundVariable.value);
          if (!isNaN(value)) {
            dataPoints[variable] = [value];
          }
        }
      } else {
        dataPoints[variable] = [];
      }
    }

    return results;
  } catch (error) {
    console.error('Error in getDebugValues:', error);
    return [];
  }
}

async function fetchAllArrayElements(session, variablesReference) {
  let allVariables = [];
  let start = 0;
  let response = null;
  const count = 10; // Fetch 10 elements at a time

  while (true) {
    try {
      response = await session.customRequest('variables', {
        variablesReference: variablesReference,
        start: start,
        count: count
      });
    }
    catch { break; }

    if (!response || !response.variables || response.variables.length === 0) {
      break;
    }

    const values = response.variables
      .filter(v => !isNaN(parseFloat(v.value)))
      .map(v => parseFloat(v.value));

    allVariables.push(...values);

    if (response.variables.length < count) {
      break;
    }

    start += count;
  }

  return allVariables;
}

async function updateChart(panel, watchedVariables, chartType) {
  console.log('Updating chart');
  const dataPoints = {};
  watchedVariables.forEach(variable => {
    dataPoints[variable] = [];
  });
  
  const debugValues = await getDebugValues(watchedVariables);
  debugValues.forEach(({ name, values }) => {
    dataPoints[name] = values;
  });
  
  console.log('Debug values:', dataPoints);
  
  let seriesData;
  if (chartType === 'pie') {
    seriesData = Object.entries(dataPoints).flatMap(([name, values]) => {
      if (Array.isArray(values) && values.length > 0) {
        return values.map((value, index) => ({
          name: `${name}[${index}]`,
          y: value
        }));
      } else {
        return [{
          name: name,
          y: values[values.length - 1] || 0
        }];
      }
    });
  } else {
    seriesData = Object.entries(dataPoints).map(([name, values]) => ({
      name: name,
      data: values.map((value, index) => [index, value])
    }));
  }

  panel.webview.postMessage({ command: 'updateChart', data: seriesData });
}

function updateAllCharts() {
  panels.forEach(({ panel, watchedVariables, chartType }) => {
    updateChart(panel, watchedVariables, chartType);
  });
}

function deactivate() { }

module.exports = {
  activate,
  deactivate
}