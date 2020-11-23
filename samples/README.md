### IMPORTANT
Before you can use the sample Lightning Web Component project provided here, it is necessary to configure it to use a Salesforce Org. If you haven't done so already, it is extremely beneficial to go through the following trails to learn about setting up your development environment and how to configure a Lightning Web Component project with a Salesforce Org:

- [Quick Start: Lightning Web Components](https://trailhead.salesforce.com/content/learn/projects/quick-start-lightning-web-components?trail_id=build-lightning-web-components)
- [Set Up Your Lightning Web Components Developer Tools](https://trailhead.salesforce.com/content/learn/projects/set-up-your-lightning-web-components-developer-tools?trail_id=build-lightning-web-components)

### What's Included
- **HelloWorld**: This is a sample Lightning Web Component that can be used to demonstrate how to locally preview a component.

- **apps > ios > LwcTestApp**: This is a native iOS app that can be used to demonstrate how a Lightning Web Component can be previewed inside a native iOS app.

- **apps > android > LwcTestApp**: This is a native Android app that can be used to demonstrate how a Lightning Web Component can be previewed inside a native Android app.

### Using the Samples
After reading through the above trails and setting up your environment, you can follow these steps to prepare the HelloWorld sample project to work with your Salesforce Org.

1. Open `HelloWorld` folder in Visual Studio Code


2. If you already have a Salesforce Org:
    - Open Command Palette in Visual Studio Code
    - Type in `Authorize` and select `SFDX: Authorize an Org`
    - Follow the onscreen steps and provide your credentials to log into your Salesforce Org (refer to the trails above for details on how to complete these steps)
    - In Visual Studio Code, ensure that a success message is printed in the Output window


3. If you don't have a Salesforce Org:
    - Open Command Palette in Visual Studio Code
    - Type in `Scratch` and select `SFDX: Create a Default Scratch Org`
    - Follow the onscreen steps to create a scratch org (refer to the trails above for details on how to complete these steps)
    - In Visual Studio Code, ensure that a success message is printed in the Output window


4. Now that you have successfully configured the HelloWorld sample project with your org, you can locally preview it:
    - In Visual Studio Code, navigate to `force-app > main > default > lwc`
    - Under `lwc`, right-click on `helloWorld` and select `SFDX: Preview Component Locally`
    - Select whether you'd like to preview it on desktop browser or on iOS/Android 
    - If you selected iOS/Android, you can then select one of the available virtual devices (if any) or choose to create your own virtual device
    - Finally indicate whether you'd like to preview the component on your mobile browser or using the provided native LWC Test App
    - Your virtual device should launch to preview your component
