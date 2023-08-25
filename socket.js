const AWS = require('aws-sdk');

const lambda = new AWS.Lambda();

exports.handler = async (event) => {
    const code = event.body;

    const params = {
        FunctionName: 'NameOfYourPythonLambdaFunction',
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify({ body: code })
    };

    try {
        const response = await lambda.invoke(params).promise();
        const result = JSON.parse(response.Payload);
        
        return {
            statusCode: 200,
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error('Error invoking Python Lambda:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error invoking Python Lambda' })
        };
    }
};
