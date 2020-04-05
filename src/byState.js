import * as d3 from "d3";
import * as topojson from "topojson";
import * as d3Legend from "d3-svg-legend";

//COVID-19 Data - USA, by State:

d3.json(
  //get topojson of the US, by county
  "https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/counties.json"
)
  .then(countyData => {
    d3.dsv(
      //get COVID-19 data (by state) from the NY Times GitHub file
      ",",
      "https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-states.csv",
      function(d) {
        //return a record for each state
        return {
          date: parseTime(d.date),
          state: d.state,
          fips: d.fips,
          cases: parseInt(d.cases, 10),
          deaths: parseInt(d.deaths, 10)
        };
      }
    )
      .then(covidStateData => {
        //define attributes for the SVG
        var width = 960,
          height = 600;
        var padding = { bottom: 50, right: 75 };
        var path = d3.geoPath();

        //create the SVG
        var svgStates = d3
          .select("#stateGraph")
          .append("svg")
          .attr("width", width)
          .attr("height", height);

        //sort the state data by # of cases to find the max
        var sorted = covidStateData
          .sort((a, b) => b.cases - a.cases)
          .filter(d => d.fips);
        var minmax = [1, sorted[0].cases]; //set a min/max range [use 1 as min for a LOG scale]

        //create the scale - map # of cases to a shade of red
        var colorScale = d3
          .scaleSequentialLog(d3.interpolateReds)
          .domain(minmax);

        //create div for tooltip
        const tooltip = d3
          .select("#stateGraph")
          .append("div")
          .attr("id", "tooltip")
          .style("opacity", 0);

        //add counties to the svg
        svgStates
          .append("g")
          .attr("class", "states")
          .selectAll("path")
          .data(
            topojson.feature(countyData, countyData.objects.states).features
          )
          .enter()
          .append("path")
          .attr("d", path)
          .attr("class", "state-outlines")
          .attr("stroke", "black")
          .attr("fill", d => {
            //set fill based on number of COVID-19 cases
            var stateInfo = covidStateData //get a list of all reports for the state ID
              .filter(bar => bar.fips === d.id)
              .sort((a, b) => b.date - a.date); //sort by date to find the most current report
            stateInfo = stateInfo.length > 0 ? stateInfo[0].cases : 0; //if no reports, set # of cases to 0
            return colorScale(stateInfo);
          })
          .on("mouseover", d => {
            //add tooltip functionality
            var stateInfo = covidStateData
              .filter(bar => bar.fips === d.id)
              .sort((a, b) => b.date - a.date);

            stateInfo = stateInfo.length > 0 ? stateInfo[0] : undefined;

            var html = stateInfo //if a report exists, get the tooltip HTML from helper method
              ? generateHtml(stateInfo)
              : `No cases reported yet`;
            tooltip
              .style("opacity", 0.9)
              .style("left", d3.event.pageX + 10 + "px")
              .style("top", d3.event.pageY - 28 + "px")
              .html(html);
          })
          .on("mouseout", () => {
            tooltip.style("opacity", 0);
          });

        //create the legend
        var legend = d3Legend
          .legendColor()
          .cells(25)
          .shapePadding(0)
          .shapeHeight(13)
          .shapeWidth(7.5)
          .labels(cell => {
            if (cell.i === 0) return "0";
            else if (cell.i === cell.genLength - 1)
              return cell.generatedLabels[cell.i];
            else if (
              cell.generatedLabels[cell.i].toString().replace(",", "") % 10 ===
              0
            )
              return cell.generatedLabels[cell.i];
            return "";
          })
          .labelFormat(d3.format(",.0f"))
          .scale(colorScale);

        //add legend to SVG
        svgStates
          .append("g")
          .attr(
            "transform",
            `translate(${width - padding.right},${height -
              padding.bottom -
              50 * 6})`
          )
          .call(legend);
      })
      .catch(e => console.log("Fetch Error: " + e));
  })
  .catch(e => console.log("DSV Error: " + e));

//Helper vars/functions

//date parser
var parseTime = d3.timeParse("%Y-%m-%d");
var formatTime = d3.timeFormat("%B %d, %Y");

//generate the HTML for the tooltip based on given record
var generateHtml = record => `<span id="state">${record.state}</span> <br>
  <span id="report">${record.cases} ${
  record.cases === 1 ? "case" : "cases"
} reported, ${record.deaths} ${
  record.deaths === 1 ? "death" : "deaths"
} reported</span> <br>
  <span id="date">(as of ${formatTime(record.date)})</span>`;
