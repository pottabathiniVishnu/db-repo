const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "covid19India.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertMovieDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictDbObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

//get all state details

app.get("/states/", async (request, response) => {
  const getStatesQuery = `
    SELECT
      *
    FROM
      state
      ORDER BY
      state_id;`;
  const statesArray = await database.all(getStatesQuery);
  response.send(
    statesArray.map((eachState) =>
      convertMovieDbObjectToResponseObject(eachState)
    )
  );
});

// get state based on id

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStatesQuery = `
    SELECT 
      *
    FROM 
      state 
    WHERE 
      state_id = ${stateId};`;
  const state = await database.get(getStatesQuery);
  response.send(convertMovieDbObjectToResponseObject(state));
});

// create district

app.post("/Districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postDisQuery = `
  INSERT INTO
    district (district_name,state_id, cases, cured, active, deaths)
  VALUES
    ('${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths});`;
  await database.run(postDisQuery);
  response.send("District Successfully Added");
});

// get district based on id

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistQuery = `
    SELECT 
      *
    FROM 
      district 
    WHERE 
      district_id = ${districtId};`;
  const district = await database.get(getDistQuery);
  response.send(convertDistrictDbObjectToResponseObject(district));
});

// deletes district

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
  DELETE FROM
    district
  WHERE
    district_id = ${districtId};`;
  await database.run(deleteDistrictQuery);
  response.send("District Removed");
});

// updates district

app.put("/districts/:districtId/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const { districtId } = request.params;
  const updateDistrict = `
    UPDATE
    district
    SET
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}
    WHERE
    district_id = ${districtId};`;

  await database.run(updateDistrict);
  response.send("District Details Updated");
});

// get stats of a state with district table

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateStatsQuery = `
    SELECT 
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths)
    FROM 
    district 
    WHERE 
    state_id = ${stateId};`;
  const stats = await database.get(getStateStatsQuery);

  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

// get statename based on a districtId

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateQuery = `
    SELECT
      state_name
    FROM
      district
      INNER JOIN state on state.state_id = district.state_id 
      WHERE 
      district_id = ${districtId};`;
  const stateArray = await database.all(getStateQuery);
  response.send(stateArray.map((each) => ({ stateName: each.state_name })));
});

module.exports = app;
