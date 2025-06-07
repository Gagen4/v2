// Sample script to demonstrate email verification using quickemailverification

var quickemailverification = require('quickemailverification').client('API_KEY').quickemailverification(); // Replace API_KEY with your API Key

// Email address which needs to be verified
quickemailverification.verify("richard@quickemailverification.com", function (err, response) {
    // Print response object
    console.log(response.body);
}); 