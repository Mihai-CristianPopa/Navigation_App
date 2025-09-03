// Started from: https://www.w3schools.com/dsa/dsa_ref_traveling_salesman.php

function makeAddStepToRoute(isDistance) {
  return function addStepToRoute(route, step) {
    if (isDistance) route.totalDistance += Number.parseFloat(step.distance);
    else route.totalDuration += Number.parseFloat(step.duration);

    if (!route.steps) route.steps = [step];
    else route.steps.push(step);
  };
}

export function buildNearestNeighborResponse(waypointIdArray, matrix, isDistance) {
  
  // We always start and finish with the first waypoint
  const startIndex = 0;

  const addStepToRoute = makeAddStepToRoute(isDistance);
  
  const n = Array.isArray(matrix) ? matrix.length : 0;
  if (n === 0 || !Array.isArray(waypointIdArray) || waypointIdArray.length !== n) {
    throw new Error("Invalid inputs: matrix must be NxN and waypointIdArray must have length N.");
  }
  for (let i = 0; i < n; i++) {
    if (!Array.isArray(matrix[i]) || matrix[i].length !== n) {
      throw new Error("Invalid matrix: must be NxN.");
    }
  }

  const startTime = process.hrtime();

  const visited = Array(n).fill(false);
  let current = startIndex;
  visited[current] = true;

  const route = {
    algorithm: "nearestNeighbour",
    computeTime: "",
    ...(isDistance ? { totalDistance: 0 } : { totalDuration: 0 }),
    steps: [],
  };

  // visit remaining n-1 nodes
  for (let visitedCount = 1; visitedCount < n; visitedCount++) {
    let bestIdx = -1;
    let bestVal = Number.POSITIVE_INFINITY;

    for (let j = 0; j < n; j++) {
      if (!visited[j]) {
        const val = matrix[current][j];
        if (val != null && isFinite(val) && val < bestVal) {
          bestVal = val;
          bestIdx = j;
        }
      }
    }

    if (bestIdx === -1) {
      throw new Error("No reachable unvisited node found. Check your matrix for connectivity & finite values.");
    }

    const step = {
      source_waypoint_idx: current,
      destination_waypoint_idx: bestIdx,
      source_id: waypointIdArray[current],
      destination_id: waypointIdArray[bestIdx],
      ...(isDistance ? { distance: matrix[current][bestIdx] } : { duration: matrix[current][bestIdx] }),
    };

    addStepToRoute(route, step);
    visited[bestIdx] = true;
    current = bestIdx;
  }

  // close the tour back to start
  const lastLegVal = matrix[current][startIndex];
  if (!(lastLegVal != null && isFinite(lastLegVal))) {
    throw new Error("Cannot close tour: last->start value is not finite.");
  }

  const finalStep = {
    source_waypoint_idx: current,
    destination_waypoint_idx: startIndex,
    source_id: waypointIdArray[current],
    destination_id: waypointIdArray[startIndex],
    ...(isDistance ? { distance: lastLegVal } : { duration: lastLegVal }),
  };
  addStepToRoute(route, finalStep);

  route.stepCount = route.steps.length;

  // finalize
  delete route._allWaypointIds;

  // this comes as an array that has on the first position the number of seconds and on the second position
  // the number of nano seconds
  const endTime = process.hrtime(startTime);
  const ms = endTime[0] * 1000 + endTime[1] / 1000000;
  route.computeTime = `${ms.toFixed(3)} ms`;

  return route;
}