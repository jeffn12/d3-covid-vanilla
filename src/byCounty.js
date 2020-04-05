import * as d3 from "d3";
import * as topojson from "topojson";
import * as d3Legend from "d3-svg-legend";

//COVID-19 Data - USA, by Counties:
d3.json(
  //get topojson of the US, by county
  "https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/counties.json"
)
  .then(countyData => {
    d3.dsv(
      //get COVID-19 case data, by County, from NY Times GitHub
      ",",
      "https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv",
      function(d) {
        return {
          date: parseTime(d.date),
          county: d.county,
          state: d.state,
          fips: d.county === "New York City" ? 36000 : parseInt(d.fips, 10), //set fips to 36000 if county is NYC
          cases: parseInt(d.cases, 10),
          deaths: parseInt(d.deaths, 10)
        };
      }
    )
      .then(covidData => {
        //set attributes for SVG
        var width = 960,
          height = 600;
        var padding = { bottom: 50, right: 75 };
        var path = d3.geoPath();

        //create the SVG
        var svgCounties = d3
          .select("#countyGraph")
          .append("svg")
          .attr("width", width)
          .attr("height", height);

        //find the min/max number of cases for the scale
        var sorted = covidData
          .sort((a, b) => b.cases - a.cases)
          .filter(d => d.fips);
        var minmax = [1, sorted[0].cases]; //use 1 as min for LOG scale
        var nyc = covidData.find(county => county.fips === 36000);

        //use the min/max # of cases to create a color scale
        var colorScale = d3
          .scaleSequentialLog(d3.interpolateReds)
          .domain(minmax);

        //create div for tooltip
        const tooltip = d3
          .select("#countyGraph")
          .append("div")
          .attr("id", "tooltip")
          .style("opacity", 0);

        svgCounties //add counties to the svg
          .append("g")
          .attr("class", "counties")
          .selectAll("path")
          .data(
            topojson.feature(countyData, countyData.objects.counties).features
          )
          .enter()
          .append("path")
          .attr("d", path)
          .attr("class", "county")
          .attr("fill", d => {
            //fill the county based on # of COVID-19 cases reported
            var countyReports = covidData
              .filter(record => record.fips === d.id)
              .sort((a, b) => b.date - a.date); //get a list of reports for the county
            countyReports = //get the # of cases - if no reports, set # of cases to 0
              countyReports.length > 0 ? countyReports[0].cases : 0;
            //check for NYC county - is d.id in the NYC array? [NYC is a special case due to the way data is reported]
            if (countyReports === 0) {
              var holder = NYC.filter(county => county.fips === d.id);
              if (holder.length > 0) countyReports = nyc.cases;
            }
            if (countyReports === 0) return "white"; //if there are still no reports, fill the county with white
            return colorScale(countyReports);
          })
          //add tooltip functionality
          .on("mouseover", d => {
            var countyReports = covidData
              .filter(bar => bar.fips === d.id)
              .sort((a, b) => b.date - a.date);
            countyReports =
              countyReports.length > 0 ? countyReports[0] : undefined;
            //check for NYC county - is d.id in the NYC array?
            if (countyReports === undefined) {
              var holder = NYC.filter(county => county.fips === d.id);
              if (holder.length > 0) countyReports = nyc;
            }
            //get HTML and show the tooltip if there are reported cases
            if (countyReports) {
              tooltip
                .style("opacity", 0.9)
                .style("left", d3.event.pageX + 10 + "px")
                .style("top", d3.event.pageY - 28 + "px")
                .html(generateHtml(countyReports));
            }
          })
          .on("mouseout", () => {
            tooltip.style("opacity", 0);
          });

        svgCounties //add state outlines to the svg
          .append("path")
          .datum(topojson.mesh(countyData, countyData.objects.states))
          .attr("id", "state-borders")
          .attr("d", path)
          .attr("stroke", "black") //outline states in black
          .attr("fill", "none");

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
        //add the legend to the map
        svgCounties
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

//helper vars/functions

//date parser
var parseTime = d3.timeParse("%Y-%m-%d");
var formatTime = d3.timeFormat("%B %d, %Y");

//FIPS map for NYC counties
const NYC = [
  { fips: 36005, county: "Bronx" },
  { fips: 36047, county: "Kings" },
  { fips: 36061, county: "New York" },
  { fips: 36081, county: "Queens" },
  { fips: 36085, county: "Richmond" }
];

//generate tooltip HTML given a county record
var generateHtml = report => `<span id="county">${
  report.county
} County</span> <br>
  <span id="report">${report.cases} ${
  report.cases === 1 ? "case" : "cases"
} reported, ${report.deaths} ${
  report.deaths === 1 ? "death" : "deaths"
} reported</span> <br>
  <span id="date">(as of ${formatTime(report.date)})</span>`;
