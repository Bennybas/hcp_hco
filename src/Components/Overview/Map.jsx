import React from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const healthcareData = {
  "01": { abbr: "AL", patients: 127, hcps: 45, adoptionRate: 68 },
  "02": { abbr: "AK", patients: 25, hcps: 12, adoptionRate: 55 },
  "04": { abbr: "AZ", patients: 192, hcps: 83, adoptionRate: 72 },
  "05": { abbr: "AR", patients: 95, hcps: 37, adoptionRate: 65 },
  "06": { abbr: "CA", patients: 873, hcps: 264, adoptionRate: 82 },
  "08": { abbr: "CO", patients: 177, hcps: 67, adoptionRate: 75 },
  "09": { abbr: "CT", patients: 128, hcps: 51, adoptionRate: 73 },
  "10": { abbr: "DE", patients: 31, hcps: 16, adoptionRate: 69 },
  "11": { abbr: "DC", patients: 24, hcps: 15, adoptionRate: 71 },
  "12": { abbr: "FL", patients: 640, hcps: 221, adoptionRate: 78 },
  "13": { abbr: "GA", patients: 274, hcps: 95, adoptionRate: 74 },
  "15": { abbr: "HI", patients: 54, hcps: 21, adoptionRate: 62 },
  "16": { abbr: "ID", patients: 58, hcps: 28, adoptionRate: 67 },
  "17": { abbr: "IL", patients: 391, hcps: 136, adoptionRate: 76 },
  "18": { abbr: "IN", patients: 247, hcps: 83, adoptionRate: 71 },
  "19": { abbr: "IA", patients: 143, hcps: 56, adoptionRate: 69 },
  "20": { abbr: "KS", patients: 129, hcps: 47, adoptionRate: 66 },
  "21": { abbr: "KY", patients: 167, hcps: 62, adoptionRate: 68 },
  "22": { abbr: "LA", patients: 186, hcps: 73, adoptionRate: 64 },
  "23": { abbr: "ME", patients: 62, hcps: 24, adoptionRate: 70 },
  "24": { abbr: "MD", patients: 245, hcps: 92, adoptionRate: 74 },
  "25": { abbr: "MA", patients: 293, hcps: 104, adoptionRate: 80 },
  "26": { abbr: "MI", patients: 373, hcps: 135, adoptionRate: 75 },
  "27": { abbr: "MN", patients: 206, hcps: 78, adoptionRate: 76 },
  "28": { abbr: "MS", patients: 104, hcps: 38, adoptionRate: 63 },
  "29": { abbr: "MO", patients: 234, hcps: 88, adoptionRate: 70 },
  "30": { abbr: "MT", patients: 48, hcps: 19, adoptionRate: 61 },
  "31": { abbr: "NE", patients: 83, hcps: 34, adoptionRate: 67 },
  "32": { abbr: "NV", patients: 153, hcps: 58, adoptionRate: 71 },
  "33": { abbr: "NH", patients: 57, hcps: 23, adoptionRate: 74 },
  "34": { abbr: "NJ", patients: 382, hcps: 138, adoptionRate: 77 },
  "35": { abbr: "NM", patients: 88, hcps: 32, adoptionRate: 68 },
  "36": { abbr: "NY", patients: 672, hcps: 241, adoptionRate: 81 },
  "37": { abbr: "NC", patients: 358, hcps: 129, adoptionRate: 76 },
  "38": { abbr: "ND", patients: 37, hcps: 15, adoptionRate: 65 },
  "39": { abbr: "OH", patients: 421, hcps: 148, adoptionRate: 73 },
  "40": { abbr: "OK", patients: 163, hcps: 63, adoptionRate: 69 },
  "41": { abbr: "OR", patients: 147, hcps: 59, adoptionRate: 72 },
  "42": { abbr: "PA", patients: 523, hcps: 187, adoptionRate: 78 },
  "44": { abbr: "RI", patients: 43, hcps: 18, adoptionRate: 74 },
  "45": { abbr: "SC", patients: 174, hcps: 64, adoptionRate: 70 },
  "46": { abbr: "SD", patients: 43, hcps: 17, adoptionRate: 66 },
  "47": { abbr: "TN", patients: 238, hcps: 89, adoptionRate: 72 },
  "48": { abbr: "TX", patients: 812, hcps: 283, adoptionRate: 79 },
  "49": { abbr: "UT", patients: 101, hcps: 40, adoptionRate: 71 },
  "50": { abbr: "VT", patients: 26, hcps: 12, adoptionRate: 68 },
  "51": { abbr: "VA", patients: 316, hcps: 115, adoptionRate: 74 },
  "53": { abbr: "WA", patients: 231, hcps: 89, adoptionRate: 75 },
  "54": { abbr: "WV", patients: 58, hcps: 22, adoptionRate: 64 },
  "55": { abbr: "WI", patients: 198, hcps: 76, adoptionRate: 72 },
  "56": { abbr: "WY", patients: 29, hcps: 13, adoptionRate: 63 }
};

const Map = () => {
  return (
    <div className="flex flex-col rounded-xl border border-gray-200 w-full ">

   
    <ComposableMap projection="geoAlbersUsa">
      <Geographies geography="https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json">
        {({ geographies }) =>
          geographies.map((geo) => {
            const stateData = healthcareData[geo.id] || {};
            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={stateData.adoptionRate > 70 ? "#4f93c0" : "#a6cee3"} // Adjust color scheme
                stroke="#FFF"
              />
            );
          })
        }
      </Geographies>
    </ComposableMap>
    </div>
  );
};

export default Map;
