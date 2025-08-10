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

export const bruteForce = (waypointIds, matrix) => {
function stringifyArray(array) {
    return JSON.stringify(array, null, 2);
}
// sources
// const rows = {0: "A", 1: "B", 2: "C"};
// const row_0 = "A"
// const row_1 = "B"
// const row_2 = "C"

// destinations
// const cols = {0: "A", 1: "B", 2: "C"};

function generateIndexToWaypointIdMap(waypointIds, mat) {
    if (waypointIds.length !== mat.length || waypointIds.length !== mat[0].length) return;
    let iterNum = waypointIds.length;
    const idxToWaypointIdMap = new Map();
    for (let i = 0; i <= iterNum - 1; i++) {
        idxToWaypointIdMap.set(i, waypointIds[i])
    }
    // console.log("Waypoint to id: ", idxToWaypointIdMap);
    return idxToWaypointIdMap
}

// const indexToWaypointIdMap = {0: "A", 1: "B", 2: "C"};
// const col_0 = "A"
// const col_1 = "B"
// const col_2 = "C"

const distances_matrix = matrix || [
    [0, 573, 1169.5],
    [573, 0, 597],
    [1169.5, 597, 0]
]

const possible_steps = [];

let routes = [];

const attractionsToSee = waypointIds || ["A", "B", "C"];

const route_max_steps = attractionsToSee.length;

const indexToWaypointIdMap = generateIndexToWaypointIdMap(attractionsToSee, distances_matrix);

const startingPoint = waypointIds[0] || "A";

const endingPoint = waypointIds[0] || "A";

let round = 0;

// let route = {
//     totalDistance: 0
// };

function getNextPossibleSteps(destination_id, route) {
    const copyPossibleSteps = Array.from(possible_steps);
    if (route.stepCount === route_max_steps) return [];
    if (route.stepCount === route_max_steps - 1) return copyPossibleSteps.filter(element => element.source_id === destination_id && element.destination_id === endingPoint);
    return copyPossibleSteps.filter(element => element.source_id === destination_id && element.destination_id !== endingPoint && route.attractionsToSee.includes(element.destination_id));
}

/** If there is the initial route setting use the default attractionsToSee global variable else start from the previously
 * stored attractionsToSee
 */
function getAttractionsToSee(destination_id, remainingAttractions = attractionsToSee){
    const copyAttractionsToSee = Array.from(remainingAttractions);
    return copyAttractionsToSee.filter(attraction => attraction !== destination_id);
}

function addStepToRoute(route, step) {
    route.totalDistance += Number.parseFloat(step.distance);
    if (!route.steps) route.steps = [step];
    else route.steps.push(step);
    if (!route.attractionsToSee) route.attractionsToSee = getAttractionsToSee(step.destination_id);   
    else route.attractionsToSee = getAttractionsToSee(step.destination_id, route.attractionsToSee);
    route.currentPosition = step.destination_id;
    route.nextPossibleSteps = getNextPossibleSteps(step.destination_id, route);
}

function getPossibleSteps(mat) {
    for (let i = 0; i < mat.length; i++) {
        for (let j = 0; j < mat[i].length; j++) {
            // On the main diagonal the distance is always 0, because this represents the route
            // between the same source and destination
            if (i !== j) {
                possible_steps.push({
                    source_waypoint_idx: i,
                    destination_waypoint_idx: j,
                    source_id: indexToWaypointIdMap.get(i),
                    destination_id: indexToWaypointIdMap.get(j),
                    distance: mat[i][j]
                })
            }
        }
    }
    // console.log('Possible steps:', possible_steps);
    return possible_steps;
}

function getPossibleStepsFromStartingPoint(startPoint) {
    const startingPointSteps = possible_steps.filter(element => element.source_id === startPoint);
    // console.log("Starting Point Steps: ", startingPointSteps);
    return startingPointSteps;
}

function getInitialRoutes() {
    for (const startingPointStep of getPossibleStepsFromStartingPoint(startingPoint)) {
        let route = {
            totalDistance: 0,
            stepCount: 1
         };
        addStepToRoute(route, startingPointStep);
        routes.push(route);
    }
    return routes;
}

// avem patru puncte posibile in care se poate merge, se adauga cate o ruta pentru fiecare dintre ele
// asta este un fel de runda, apoi incepe o noua runda, dar acum avem mai multe rute pentru care trebuie
// sa adaugam cate o ruta pentru fiecare punct disponibil
// deci inputul ar fi lista de rute, apoi iteram prin rute, si iteram prin punctele disponibile pentru ruta respectiva si adaugam mai multe rute


function recursiveIterate(routes, round) {
    if (round === route_max_steps) return routes;
    if (routes.length === 0) {
        const initalRoutes = getInitialRoutes(); 
        return recursiveIterate(initalRoutes, round + 1);
    };
    let newRoutes = [];
    for (const route of routes) {
        for (const possibleStep of route.nextPossibleSteps) {
            let newRoute = JSON.parse(JSON.stringify(route));
            newRoute.stepCount += 1;
            addStepToRoute(newRoute, possibleStep);
            newRoutes.push(newRoute);
        }
    }
    // round += 1;
    // routes = newRoutes;
    return recursiveIterate(newRoutes, round + 1);
}

// function _(inputRoute){
//     if (inputRoute.nextPossibleSteps.length === 0) return inputRoute;
//     inputRoute.stepCount += 1;
//     addStepToRoute(inputRoute, inputRoute.nextPossibleSteps[0]);
// }

function iterate() {
    // Iterating through the initial routes
    for (const iterRoute of routes) {
        // Setting ending point for the initial routes
        while (iterRoute.stepCount !== route_max_steps) {
            // If there is just the last step left to do, then return fast
            if (iterRoute.nextPossibleSteps.length === 1) {
                iterRoute.stepCount += 1;
                addStepToRoute(iterRoute, iterRoute.nextPossibleSteps[0]);
                break;
            }
            // If there are multiple possiblle steps, then there will be new routes that should be added
            // and kept track of
            for (const possibleNextStep of iterRoute.nextPossibleSteps) {
                iterRoute.stepCount += 1;
                addStepToRoute(iterRoute, possibleNextStep);
            }
        }
    }
}

/** Used for sorting ascending (fastest route first) the routes based on distance */
function compareTotalDistance(a, b) {
    if (a.totalDistance < b.totalDistance) return -1;
    else if (a.totalDistance > b.totalDistance) return 1;
    else return 0;
}

function getFastestRoute() {
    // console.log("Routes before sorting, ", routes );
    routes.sort(compareTotalDistance);
    const fastestRoute = routes[0];
    // console.log(stringifyArray(fastestRoute));

    return fastestRoute;
    // console.log("Sorted routes: ", routes);
}

getPossibleSteps(distances_matrix);

// getInitialRoutes();

// iterate();

routes = recursiveIterate(routes, round);

return getFastestRoute();
// for (const startingPointStep of getPossibleStepsFromStartingPoint(startingPoint)) {
//     route.stepCount = 1;
//     addStepToRoute(route, startingPointStep);
//     routes.push(route);
//     route = {
//         totalDistance: 0
//     };
// }

// console.log("Routes: ", routes);
}

// bruteForce(null, null);