// 	    A	    B	    C
// A	A → A	A → B	A → C
// B	B → A	B → B	B → C
// C	C → A	C → B	C → C


//  "durations": [
//     [0, 573, 1169.5],
//     [573, 0, 597],
//     [1169.5, 597, 0]
//   ],

// Starting from A, ending in A

// That means we need to see what is the fastest route:

// A -> B -> C -> A = A -> B(573) + B -> C(597) + C->A(1169.5) ~= 2300

// A -> C -> B -> A = A -> C(1169.5) + C->B(597) + B->A(573) ~= 2300


// Brute force:

// 1st step go on first line, jump the same index column

// N nodes -> N routes, route 1 starts with the first point and route N ends with the first point

// steps.add {
// source_index: _
// destination_index: _
// distance: _
// }

// route.add steps

// routes.add route

export const bruteForce = (waypointIds, matrix, isDistance=true) => {
    function generateIndexToWaypointIdMap(waypointIds, mat) {
        if (waypointIds.length !== mat.length || waypointIds.length !== mat[0].length) return;
        let iterNum = waypointIds.length;
        const idxToWaypointIdMap = new Map();
        for (let i = 0; i <= iterNum - 1; i++) {
            idxToWaypointIdMap.set(i, waypointIds[i])
        }
        return idxToWaypointIdMap
    }

    const startTime = process.hrtime();

    const route_max_steps = waypointIds.length;

    const startingPoint = waypointIds[0];

    const endingPoint = startingPoint;

    const indexToWaypointIdMap = generateIndexToWaypointIdMap(waypointIds, matrix);

    const possible_steps = getPossibleSteps(matrix);

    function getNextPossibleSteps(destination_id, route) {
        if (route.stepCount === route_max_steps) return [];
        if (route.stepCount === route_max_steps - 1) return possible_steps.filter(element => element.source_id === destination_id && element.destination_id === endingPoint);
        return possible_steps.filter(element => element.source_id === destination_id && element.destination_id !== endingPoint && route.attractionsToSee.includes(element.destination_id));
    }

    /** If there is the initial route setting use the default attractionsToSee global variable else start from the previously
     * stored attractionsToSee
     */
    function getAttractionsToSee(destination_id, remainingAttractions = waypointIds){
        return remainingAttractions.filter(attraction => attraction !== destination_id);
    }

    function addStepToRoute(route, step) {
        if (isDistance) route.totalDistance += Number.parseFloat(step.distance);
        else route.totalDuration += Number.parseFloat(step.duration);
        if (!route.steps) route.steps = [step];
        else route.steps.push(step);
        if (!route.attractionsToSee) route.attractionsToSee = getAttractionsToSee(step.destination_id);   
        else route.attractionsToSee = getAttractionsToSee(step.destination_id, route.attractionsToSee);
        route.currentPosition = step.destination_id;
        route.nextPossibleSteps = getNextPossibleSteps(step.destination_id, route);
    }

    function getPossibleSteps(matrix) {
        const possible_steps = [];
        for (let i = 0; i < matrix.length; i++) {
            for (let j = 0; j < matrix[i].length; j++) {
                // On the main diagonal the distance is always 0, because this represents the route
                // between the same source and destination
                if (i !== j) {
                    possible_steps.push(buildPossibleStep(matrix, i, j));
                }
            }
        }
        return possible_steps;
    }

    function buildPossibleStep(mat, i, j) {
        const possibleStep = {
            source_waypoint_idx: i,
            destination_waypoint_idx: j,
            source_id: indexToWaypointIdMap.get(i),
            destination_id: indexToWaypointIdMap.get(j),
        };
        if (isDistance) possibleStep.distance = mat[i][j];
        else possibleStep.duration = mat[i][j];
        return possibleStep;
    }

    function getPossibleStepsFromStartingPoint() {
        return possible_steps.filter(element => element.source_id === startingPoint);
    }

    function getInitialRoutes() {
        const routes = []
        for (const startingPointStep of getPossibleStepsFromStartingPoint()) {
            let route = buildInitialRoute();
            addStepToRoute(route, startingPointStep);
            routes.push(route);
        }
        return routes;
    }

    function buildInitialRoute() {
        const route = {
            algorithm: "bruteForce",
            computeTime: "", 
            stepCount : 1
         };
        if (isDistance) route.totalDistance = 0;
        else route.totalDuration = 0;
        return route;
    }

    // avem patru puncte posibile in care se poate merge, se adauga cate o ruta pentru fiecare dintre ele
    // asta este un fel de runda, apoi incepe o noua runda, dar acum avem mai multe rute pentru care trebuie
    // sa adaugam cate o ruta pentru fiecare punct disponibil
    // deci inputul ar fi lista de rute, apoi iteram prin rute, si iteram prin punctele disponibile pentru ruta respectiva si adaugam mai multe rute
    function recursiveIterate(routes, round) {
        if (round === route_max_steps) return routes;
        let newRoutes = [];
        for (const route of routes) {
            for (const possibleStep of route.nextPossibleSteps) {
                let newRoute = JSON.parse(JSON.stringify(route));
                newRoute.stepCount += 1;
                addStepToRoute(newRoute, possibleStep);
                newRoutes.push(newRoute);
            }
        }
        return recursiveIterate(newRoutes, round + 1);
    }

    /** Used for sorting ascending (fastest route first) the routes based on distance */
    function compareTotalDistance(a, b) {
        return compareTotal(a, b, "totalDistance");
    }

    /** Used for sorting ascending (fastest route first) the routes based on duration */
    function compareTotalDuration(a, b) {
        return compareTotal(a, b, "totalDuration");
    }

    function compareTotal(a, b, total="totalDistance") {
        if (a[total] < b[total]) return -1;
        else if (a[total] > b[total]) return 1;
        else return 0;
    }

    function getFastestRoute(routes) {
        if (isDistance) routes.sort(compareTotalDistance);
        else routes.sort(compareTotalDuration);
        const fastestRoute = routes[0];
        
        const endTime = process.hrtime(startTime);
        const ms = endTime[0] * 1000 + endTime[1] / 1000000;
        fastestRoute.computeTime = `${ms.toFixed(3)} ms`;
        // fastestRoute["computeTime"] = `${Date.now() - startTime} ms`;
        return fastestRoute;
    }

    return getFastestRoute(recursiveIterate(getInitialRoutes(), 1));
}