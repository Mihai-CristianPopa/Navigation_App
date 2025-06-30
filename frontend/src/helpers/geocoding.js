import L from "leaflet";
import "leaflet-control-geocoder";
import $ from "jquery";

export function geocodeAttraction(attractionName, callback) {
    const proxy = "https://trlli3vo4kjpcvi2o7s7iafb7u0xftzw.lambda-url.eu-west-3.on.aws/"
    const url = `${proxy}https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(attractionName)}&limit=1&addressdetails=1`;
    $.ajax({
        url: url,
        method: "GET",
        headers: {
            'User-Agent': 'NavigationApp/1.0 (mihaipopa00@gmail.com)',
            'Origin': window.location.origin,
            'X-Requested-With': 'XMLHttpRequest'
        },
     }).done(results => {
        if (results.length > 0) {
            console.log(results[0])
            return results[0];
        } else {
            alert("Attraction not found!");
        }
     }).catch(xhr => console.error(xhr));
    // const geocoder = L.Control.Geocoder.nominatim({
    //     // serviceUrl : `${proxy}https://nominatim.openstreetmap.org/`,
    //     geocodingQueryParams: {
    //         format: 'json',
    //         addressdetails: 1,
    //         limit: 1,
    //         'User-Agent': 'NavigationApp/1.0 (mihaipopa00@gmail.com)'
    //     }
    // });
    // // const geocoder = L.Control.Geocoder.nominatim();
    // // const results = await geocoder.geocode(attractionName);
    // // if (results.length > 0) {
    // //     return results[0];
    // // } else {
    // //     alert("Attraction not found!");
    // // }
    // // geocoder.geocode(attractionName).then((results) => {
    // //     if (results.length > 0) {
    // //         return results[0];
    // //     } else {
    // //         alert("Attraction not found!");
    // //     }
    // // }).catch(xhr => console.error(xhr));
    // geocoder.geocode(attractionName, (results) => {
    //     if (results.length > 0) {
    //         callback(results[0]);
    //     } else {
    //         alert("Attraction not found!");
    //     }
    // });
}