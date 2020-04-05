import * as d3 from "d3";

d3.dsv(
  //get COVID-19 data (by state) from the NY Times GitHub file
  ",",
  "https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-states.csv",
  function(d) {
    //return a record for each state
    return {
      date: parseTime(d.date),
      state: d.state,
      fips: parseInt(d.fips, 10),
      cases: parseInt(d.cases, 10),
      deaths: parseInt(d.deaths, 10)
    };
  }
)
  .then(covidStateData => {
    var padding = { top: 50, right: 50, bottom: 50, left: 50 },
      width = window.innerWidth - padding.left - padding.right, // Use the window's width
      height = window.innerHeight - padding.top - padding.bottom; // Use the window's height
    var target_state = "New York";

    //add a title to the chart
    d3.select("#title").html(
      `<h3>Total Number of COVID-19 Cases in ${target_state}, by day</h3>
        <p><em>(mouse-over/tap to get more information)</em></p>`
    );

    //get array of target state reports
    var stateReports = covidStateData
      .filter(report => report.state === target_state)
      .sort((a, b) => a.date - b.date);
    var caseData = stateReports.map(report => report.cases);

    var svg = d3
      .select("#trendGraph")
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    var yScale = d3
      .scaleLinear()
      .domain([d3.min(caseData), d3.max(caseData)])
      .range([height - padding.top, padding.bottom]);

    var xScale = d3
      .scaleTime()
      .domain([
        stateReports[0].date,
        stateReports[stateReports.length - 1].date
      ])
      .range([padding.left, width - padding.right]);

    var xAxis = d3
      .axisBottom(xScale)
      .ticks(stateReports.length)
      .tickFormat(d3.timeFormat("%m/%d/%y"))
      .tickSize(10);

    svg
      .append("g")
      .attr("transform", "translate(0," + (height - padding.bottom) + ")")
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("transform", "rotate(-65)");
    svg
      .append("g")
      .attr("transform", "translate(" + padding.left + ",0)")
      .call(d3.axisLeft(yScale));

    var line = d3
      .line()
      .x(function(d, i) {
        return xScale(d.date);
      })
      .y(function(d) {
        return yScale(d.cases);
      })
      .curve(d3.curveBasis); // apply smoothing to the line

    svg
      .append("path")
      .datum(stateReports)
      .attr("class", "line")
      .attr("d", line);

    //generate tooltip
    const tooltip = d3
      .select("#trendGraph")
      .append("div")
      .attr("id", "tooltip")
      .style("opacity", 0);

    svg
      .selectAll(".dot")
      .data(stateReports)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", function(d) {
        return xScale(d.date);
      })
      .attr("cy", function(d) {
        return yScale(d.cases);
      })
      .attr("r", 5)
      .on("mouseover", d => {
        //add tooltip functionality
        tooltip
          .style("opacity", 0.9)
          .style("left", d3.event.pageX + 10 + "px")
          .style("top", d3.event.pageY - 28 + "px")
          .html(`<h4>${d.cases} cases</h4><h5>${formatTime(d.date)}</h5>`);
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });
  })
  .catch(e => "Error Retrieving Data From NY Times: " + e);

//helper vars/functions

//date parser
var parseTime = d3.timeParse("%Y-%m-%d");
var formatTime = d3.timeFormat("%B %d, %Y");
