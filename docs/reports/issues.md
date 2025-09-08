1. the /setup page still have issue, the wordings are still in black. why do you keep making the same mistake c:\Users\Ethan\Desktop\ai-project\expense-tracker\image.png  │

2. on the setup wizard, add loading states on to button if required to talk to backend, like any submission it should have a loading state. so that user dont keep clicking on the button and send multiple request.                                                                                                                          

3. when trying to /create on telegram bot for a "Entertainment" Category, got this error   
"Error creating expense: {

  code: '23514',

  details: 'Failing row contains (4a0533cd-a903-453b-b643-c5ebf6eac3e3, 149a0ccd-3dd7-44a4-ad2e-42cc2c7e4498, 2025-08-25, GSC Cinema, entertainment, 80.70, 2025-08-25 02:26:29.363+00, 2025-08-25 02:26:29.615321+00).',

  hint: null,

  message: 'new row for relation "expenses" violates check constraint "expenses_category_check"'

}

Error creating expense: {

  code: '23514',

  details: 'Failing row contains (4a0533cd-a903-453b-b643-c5ebf6eac3e3, 149a0ccd-3dd7-44a4-ad2e-42cc2c7e4498, 2025-08-25, GSC Cinema, entertainment, 80.70, 2025-08-25 02:26:29.363+00, 2025-08-25 02:26:29.615321+00).',

  hint: null,

  message: 'new row for relation "expenses" violates check constraint "expenses_category_check"'

}"                                                                                                                                                                                                                                                           

4. when upload a receipt on to telegram, once analyze succesfully it is still talking about google sheets not configured, &'c:\Users\Ethan\Desktop\ai-project\expense-tracker\image copy.png' and just make it simple, just need receipt date, store name, category and the total amount. dont need to break it down to itemize item. and comemnt out all the things related to google sheet.                                                                                  

5. i want to add another enhancement whereby, when the user completed the setup wizard and got redirected to the dashboard. i want to display a popup on the dashboard, is a tutorial guide, to tell user what this feature is about, the popup only auto pop out for the new user that completed the setup, it will not popup again after. the popup can do like a 3 steps, step 1 can talk about telegram, to tell user to start can go into their telegram bot and type /start and provide some guidance, 2nd step can talk about the dashboard what the user can find out here in the dashboard, and 3rd step can talk about the transactions page where they can find all their list of transactions there. The user can close the tutorial guide. they can open the tutorial guide again on the left hand side of the menu, clicking on the tutorial on the left side of the menu, will display the same popup again. 

please make sure you understand fully first what you want to do, if u have any question that u are unclear about your requirement u can ask first. provide a todo list make sure think about all the dependencies when doing any enhancement. Once you are done push to github