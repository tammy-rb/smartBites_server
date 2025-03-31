export default function convertEmptyStringsToNull(req, res, next) {
    if (req.method === 'POST' || req.method === 'PUT') {
        // Loop through all properties of the request body
        for (let key in req.body) {

            // If value is an empty string, convert it to null
            if (req.body[key] === '') {
                req.body[key] = null;
                console.log(`Replaced empty string with null for ${key}`);
            }
        }
    }
    next(); // Proceed to the next middleware or route handler
}
