const people = Object.keys(npcdict);
let allowMisplacedTruffle = false;

function updateNumPossibleGroups() {
  // count number of npcs we can use
  let n = 0;
  for (const person of people) {
    if (document.getElementById(person + "Checkbox").checked) {
      n += 1;
    }
  }

  if (n == 0) {
    document.getElementById("numPossibleGroups").value = 0;
    return;
  }

  let minGroupSize = document.getElementById("minGroupSize").value;
  let maxGroupSize = document.getElementById("maxGroupSize").value;


  // build pascal's triangle so we can do n choose k

  let pascals = [[1]];
  for (let i = 1; i <= n; i++) {
    // add ith row
    let newRow = [1];
    for (let j = 1; j < i; j++) {
      newRow.push(pascals[i - 1][j - 1] + pascals[i - 1][j]);
    }
    newRow.push(1);
    pascals.push(newRow);
  }

  numOfPeopleInGroups = 0;
  let numOfGroups = 0;
  for (let k = minGroupSize; k <= maxGroupSize; k++) {
    // add n choose k for every k
    numOfGroups += pascals[n][k];
    numOfPeopleInGroups += pascals[n][k] * k;
  }
  document.getElementById("numPossibleGroups").value = numOfGroups;
}

function genBiomeTable() {
  let tableHTML = "<table>";
  tableHTML += "<tr> <th>Biome</th> <th>Include biome?</th> <th>Require pylon here?</th>";
  for (const biome of baseBiomes) {
    tableHTML += "<tr>";
    tableHTML += "<td>" + biome + "</td>";
    tableHTML += "<td style=\"text-align:center\"> <input style=\"width:1.5em; height:1.5em\"";
    tableHTML += "type=\"checkbox\" id=\"" + biome + "IncludeCheckbox\" checked onchange=\"checkBiomePylon(this)\"> </td>";
    tableHTML += "<td style=\"text-align:center\"> <input style=\"width:1.5em; height:1.5em\"";
    tableHTML += "type=\"checkbox\" id=\"" + biome + "PylonCheckbox\"> </td>";
    tableHTML += "</tr>";
  }
  tableHTML += "</table>";
  document.getElementById('biomeTableDiv').innerHTML = tableHTML;
}

function checkBiomePylon(checkbox) {
  let biome = checkbox.id.slice(0, -15);
  if (!checkbox.checked) {
    document.getElementById(biome + "PylonCheckbox").checked = false;
    document.getElementById(biome + "PylonCheckbox").disabled = true;
  } else {
    document.getElementById(biome + "PylonCheckbox").disabled = false;
  }
}

function includePylonBiomes() {
  for (const biome of baseBiomes) {
    document.getElementById(biome + "PylonCheckbox").checked = true;
  }
}

function genNPCtable() {
  let output = document.getElementById('npcTableDiv');
  let table = document.createElement('table');
  let header = document.createElement('tr');
  let td = (child, tag = 'td') => {
    let output = document.createElement(tag);
    output.replaceChildren(child);
    return output;
  };
  header.replaceChildren(
    td('NPC name', 'th'),
    td('Include this NPC?', 'th'),
    td('NPC importance (higher = more important)', 'th'),
  );
  let enableBox = (person) => {
    let output = document.createElement('input');
    output.type = 'checkbox';
    output.onchange = updateNumPossibleGroups;
    output.id = `${person}Checkbox`;
    return output;
  };
  let allWeightInputs = [];
  let weightBox = (person) => {
    let output = document.createElement('div');
    let slider = document.createElement('input');
    slider.type = 'range';
    slider.style.width = '15em';
    slider.min = 0;
    slider.max = 20;
    slider.step = 'any';
    slider.value = 1;
    let exact = document.createElement('input');
    exact.type = 'number';
    exact.style.width = '5em';
    exact.id = `${person}Weighting`;
    exact.oninput = (event) => slider.value = event.target.value;
    slider.oninput = (event) => exact.value = event.target.value;
    exact.min = 0;
    exact.step = 'any';
    exact.value = 1;
    allWeightInputs.push(slider, exact);
    output.replaceChildren(slider, exact);
    return output;
  };
  table.appendChild(header);
  for (const person of people) {
    let row = document.createElement('tr');
    // name
    row.appendChild(td(person));
    // include
    row.appendChild(td(enableBox(person)));
    // weighting
    row.appendChild(td(weightBox(person)));
    table.appendChild(row);
  }
  output.replaceChildren(table);

  let buttons = [];

  Object.entries(modNpcs).forEach(([mod, npcs]) => {
    let addButton = document.createElement('button');
    addButton.textContent = `Select all ${mod} NPCs`;
    addButton.onclick = () => {
      for (const npc of npcs) {
        document.getElementById(`${npc}Checkbox`).checked = true;
      }
      updateNumPossibleGroups();
    };
    buttons.push(addButton);

    let remButton = document.createElement('button');
    remButton.textContent = `Deselect all ${mod} NPCs`;
    remButton.onclick = () => {
      for (const npc of npcs) {
        document.getElementById(`${npc}Checkbox`).checked = false;
      }
      updateNumPossibleGroups();
    };
    buttons.push(remButton);
  });
  let resetWeightButton = document.createElement('button');
  resetWeightButton.textContent = "Reset importance of ALL NPCs";
  resetWeightButton.onclick = () => allWeightInputs.forEach(input => input.value = 1);
  buttons.push(resetWeightButton);
  // I don't know how many times this is called. Use replaceChildren as it should be fast
  document.getElementById('quickButtons').replaceChildren(...buttons);
}

function genResultsTable(groups) {
  groups.sort((a, b) => {
    let c = a[1].map(y => y.map(x => baseBiomes.indexOf(x)).toString()).join("");
    let d = b[1].map(y => y.map(x => baseBiomes.indexOf(x)).toString()).join("");
    return c > d ? 1 : d > c ? -1 : 0;
  });
  let output = document.getElementById("resultTableDiv");
  let tableHTML = "<table>";
  tableHTML += "<tr> <th>Biome(s) for group</th>";
  tableHTML += "<th>NPCs in this group (and their pricing modifier for each biome)</th></tr>";
  for (const group of groups) {
    biome = group[1];
    biome = biome.filter((b, i) => {
      let copyWithoutB = biome.slice(); copyWithoutB.splice(i, 1);
      return copyWithoutB.every(y => y.some(x => !b.includes(x)));
    }); // basically if [[hallow],[hallow,desert]] then reduce this to just [[hallow]]
    tableHTML += "<tr><td>" + biome.map(x => x.join(" + ")).join("<br />") + "</td><td>";
    for (const person of group[0]) {
      tableHTML += person;
      let neighbours = group[0].filter((name) => name !== person);
      let personHappiness = biome.map(b => (oneHappiness(person, b, neighbours) / npcdict[person]["weighting"]).toFixed(2));
      tableHTML += "(" + personHappiness.join(",") + "), ";
    }
    // remove extra comma and space before ending row
    tableHTML = tableHTML.slice(0, -2) + "</td></tr>";
  }

  output.innerHTML += tableHTML + "</table><br>";
}
function showAllResults(data) {
  let output = document.getElementById("resultTableDiv");
  output.innerHTML = "";

  // sort groups within each solution by the people
  for (var solu of data) {
    solu = solu.sort((a, b) => {
      let c = JSON.stringify(a[0]);
      let d = JSON.stringify(b[0]);
      return c > d ? 1 : d > c ? -1 : 0;
    });
  }
  // sort all solutions by the people
  let sortedData = data.sort((a, b) => {
    let c = JSON.stringify(a.map(group => group[0])); let d = JSON.stringify(b.map(group => group[0]));
    return c > d ? 1 : d > c ? -1 : 0;
  });

  genResultsTable(sortedData[0]);

  for (let i = 1; i < sortedData.length; i++) {
    let prevsolu = sortedData[i - 1];
    let solu = sortedData[i];
    output.innerHTML += "Above has:<br>";
    output.innerHTML += prevsolu.filter(x => !solu.map(y => JSON.stringify(y[0])).includes(JSON.stringify(x[0])))
      .map(x => x[0].join(", ")).join("<br>") + "<br>";
    output.innerHTML += "<br>Below has:<br>";
    output.innerHTML += solu.filter(x => !prevsolu.map(y => JSON.stringify(y[0])).includes(JSON.stringify(x[0])))
      .map(x => x[0].join(", ")).join("<br>") + "<br>";
    genResultsTable(solu);
  }
}
function handleWorkerMessage(phase, data) {
  switch (phase) {
    case "mid":
      requestAnimationFrame(() => {
        document.getElementById("newBestSolutionsFound").value = data[0];
        document.getElementById("timeElapsedSearch").value = data[1];
        document.getElementById("branchesPruned").value = data[2];
      });
      break;

    case "cacheGen":
      requestAnimationFrame(() => {
        document.getElementById("cacheGenPercent").value = (data[0] * 100).toFixed(2) + '%';
        document.getElementById("timeElapsedCache").value = data[1];
      });
      break;

    case "cache":
      requestAnimationFrame(() => {
        document.getElementById("timeElapsedCache").value = data;
        document.getElementById("cacheGenPercent").value = '100%';
      });
      break;

    case "result":
      requestAnimationFrame(() => showAllResults(data));
      break;

    case "done":
      requestAnimationFrame(() => {
        document.getElementById("timeElapsedSearch").value += " FINISHED";
      });
      document.getElementById('start').disabled = false;
      break;

    default:
  }
}
let myWorker = null;
function startSearch() {
  document.getElementById('start').disabled = true;
  if (myWorker) { myWorker.terminate(); }
  myWorker = new Worker("solver.js");
  requestAnimationFrame(() => {
    document.getElementById("timeElapsedCache").innerHTML = "0.000";
    document.getElementById("newBestSolutionsFound").innerHTML = "0";
    document.getElementById("timeElapsedSearch").innerHTML = "0.000";
    document.getElementById("branchesPruned").innerHTML = "0";
    document.getElementById("resultTableDiv").innerHTML = "";
  });

  let peopleWeCanUse = [];
  for (const person of people) {
    if (document.getElementById(person + "Checkbox").checked) {
      peopleWeCanUse.push(person);
      // don't allow non-positive values for the weighting
      npcdict[person]["weighting"] = Math.max(Number.EPSILON,
        document.getElementById(person + "Weighting").value);
    }
  }
  let minBiomes = [];
  for (const biome of baseBiomes) {
    if (document.getElementById(biome + "PylonCheckbox").checked) {
      let biomeInclude = document.getElementById(biome + "IncludeCheckbox").checked;
      if (biomeInclude) {
        minBiomes.push(biome);
      } else {
        document.getElementById(biome + "PylonCheckbox").checked = false;
      }
    }
  }
  let minGroupSize = document.getElementById("minGroupSize").value;
  let maxGroupSize = document.getElementById("maxGroupSize").value;

  let biomes = biomes1;

  for (const biome of baseBiomes) {
    if (!document.getElementById(biome + "IncludeCheckbox").checked) {
      biomes = biomes.filter(x => !x.includes(biome));
    }
  }

  myWorker.postMessage([[npcdict, biomes, allowMisplacedTruffle], [peopleWeCanUse, minGroupSize, maxGroupSize, minBiomes]]);
  myWorker.onmessage = function (e) { handleWorkerMessage(...e["data"]); };
}



genBiomeTable();
genNPCtable();
updateNumPossibleGroups()

