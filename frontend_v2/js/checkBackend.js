/**
 * 
 * @description
 * We want to check whether a local instance of the backend is ran
 * or a remote backend is available and based on the available option
 * to set the backend origin constant which we will be using for the
 * backend requests
 * @returns a string containing the backend origin that should be used for requests
 */
export default async function resolveBackendOrigin() {
    const localOrigin = "http://localhost:3000";
    const remoteOrigin = "https://backend-navigation-app.onrender.com";
    const origins = [localOrigin, remoteOrigin];
    const healthEndpoint = "health";
    for (const origin of origins) {
        try {
            const res = await fetch(`${origin}/${healthEndpoint}`);
            // No need for checking res.ok since we only send success responses
            // Only issue that could come up is if the backend is down which will be
            // Caught by the catch block
            if (res.ok) {
                return origin;
            }
            console.warn(`Health check at ${origin} returned ${res.status}`);
        } catch(error) {
            console.warn(`Network error checking ${origin}:`, error);
        }
    }
    return "";
}