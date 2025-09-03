// Started from this: https://github.com/AustinLBuchanan/TSP_VRP/blob/main/two_opt_heuristic.ipynb
export function twoOpt(waypointIds, matrix, isDistance = true, initialOrder = null, previousComputeTime = null) {
  const n = Array.isArray(waypointIds) ? waypointIds.length : 0;
  if (n === 0) throw new Error("waypointIds must be a non-empty array");
  if (!Array.isArray(matrix) || matrix.length !== n || matrix.some(r => !Array.isArray(r) || r.length !== n)) {
    throw new Error("matrix must be an NxN array aligned with waypointIds");
  }

  const startTime = process.hrtime();


  let order;

  if (initialOrder && Array.isArray(initialOrder) && initialOrder.length === n ) {
    order = [...initialOrder];
    // Validate the order contains all indices
    const sortedOrder = [...order].sort((a, b) => a - b);
    const expectedOrder = Array.from({length: n}, (_, i) => i);
    if (!sortedOrder.every((val, idx) => val === expectedOrder[idx])) {
      throw new Error("Invalid initial order: must contain all waypoint indices");
    }
  } else {
    // Default: sequential order [0, 1, 2, ..., n-1]
    order = Array.from({ length: n }, (_, i) => i);
  }

  const getCost = (i, j) => {
    const v = matrix[i][j];
    if (v == null || !isFinite(v)) throw new Error(`Invalid cost at [${i}][${j}]`);
    return Number(v);
  };

  // 2-opt improvement loop (symmetric TSP)
  const EPS = 1e-12;
  let improved = true;
  let iterationCount = 0;
  const MAX_ITERATIONS = 1000; // Safety limit
  while (improved && iterationCount < MAX_ITERATIONS) {
    improved = false;
    iterationCount += 1;
    for (let i = 1; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        // Don't allow swaps that would move waypoint 0 from position 0
        if (i === 1 && k === n - 1) continue;

        // we see a-b as an edge and c-d as an edge
        // and we connect a-c and b-d and we do a reverse
        const a = order[i - 1];
        const b = order[(i) % n];
        const c = order[k];
        const d = order[(k + 1) % n];

        const delta = getCost(a, c) + getCost(b, d) - (getCost(a, b) + getCost(c, d));
        if (delta < -EPS) {
          // Perform 2-opt swap: reverse segment from i to k
          reverseSegment(order, i, k);
          improved = true;
          break; // Start over after improvement
        }
      }
      if (improved) break;
    }
  }

    if (iterationCount >= MAX_ITERATIONS) {
    console.warn(`2-opt reached maximum iterations (${MAX_ITERATIONS})`);
  }


  // Build steps from final order (closed tour)
  const steps = [];
  let total = 0;
  for (let t = 0; t < n; t++) {
    const src = order[t];
    const dst = order[(t + 1) % n];
    const stepVal = getCost(src, dst);
    total += stepVal;

    const step = {
      source_waypoint_idx: src,
      destination_waypoint_idx: dst,
      source_id: waypointIds[src],
      destination_id: waypointIds[dst],
      ...(isDistance ? { distance: stepVal } : { duration: stepVal }),
    };
    steps.push(step);
  }

    const endTime = process.hrtime(startTime);
    const ms = endTime[0] * 1000 + endTime[1] / 1000000 + (previousComputeTime === null ? 0 : previousComputeTime);

  const payload = {
    algorithm: initialOrder === null ? "twoOpt" : "twoOptNN",
    computeTime: `${ms.toFixed(3)} ms`,
    stepCount: steps.length,
    iterationCount,
    steps,
    ...(isDistance ? { totalDistance: total } : { totalDuration: total }),
  };

  return payload;
}

  /** Helper function to reverse a segment of the tour. */ 
  function reverseSegment(order, start, end) {
    while (start < end) {
      [order[start], order[end]] = [order[end], order[start]];
      start++;
      end--;
    }
  }