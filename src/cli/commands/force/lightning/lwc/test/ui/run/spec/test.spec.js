const Eula = require('salesforce-pageobjects/salesforceapp/pageObjects/authentication/eula');
const Login = require('salesforce-pageobjects/helpers/pageObjects/login');

describe('Login to Salesforce App', () => {
    it('testLogin', async () => {
        const eula = await utam.load(Eula);
        await eula.accept();

        utam.setBridgeAppTitle('Login | Salesforce');
        const login = await utam.load(Login);

        await login.loginToHomePage('foo@bar.com', 'test1234', '');
    });
});