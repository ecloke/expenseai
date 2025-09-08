# new enhancement

Basically what I want to build is a feature for user to record expenses that is not their daily expenses type. you can think of it like the user wants to go for a trip for example, lets say Thailand. So these expenses they want to save it separately so that they know how much they have spent on Thailand for example.  

In summary how this works is basically user can use telegram bot to create a new project, what this does is that it allows user to create expenses under this project. user can have multiple projects, each projects should have a name,  have an open/ close status, and a currency. 

So for this feature there are a new things we need to implement
1. Telegram bot enhancement
2. Webapp enhancement: /projects Page
3. Webapp enhancement: /transactions Page
3. Webapp enhancement: /dashboard Page

# Telegram Bot Enhancement

New commands added
/new - to create a new project
/list - to list out all the open projects
/close - to select an open status project to close status
/open - to select a close status project to open status

1. So user can create a new project by typing /new in their telegram bot
2. the telegram bot will then ask the user to name their project, once the user type the name, the telegram bot will then ask what currency this project is, user then can type the currency. We dont need any selection for actual currency, just let user type whatever currency naming they want, this currency that the user type will be the currency used for that specific project. This will then create a project under this userid, and telegram bot will let user know the project is created successfully, or failed to create. 

After a project is created the status of the project will be open. So if there are any open status project, when the user uploads an image, or when user type in /create, it will first list out all the open status projects, for user to choose where they want this expenses to be saved on. 

For example user have created 2 new projects, lets assume is Project A and Project B. then now user uploads a receipt on telegram, after AI analyze it, the telegram bot will ask the user which project they want to save it on. Similarly if the user type /create, and after going through the steps of creating the transaction, the telegram bot will ask the user which project they want to save it on.

1. General expenses
2. Project A
3. Project B

the general expenses meaning it is not tied to any project which is what we have right now in production. then user need to select first then the expenses will save accordingly, based on what the user selected.

If there are no open projects, then it will automatically save without a project ID. which is what we currently have now.

2. /list is basically a simple command to list out all the open projects, so that the user know what are all the current open projects. if there are no open projects, the bot will say there are currently no open projects, if you wish to create one just type /new

3. /close is a command to close a project, when user type /close, it will list out all the open projects, and user get to select which open project they want to close, after the user select, it will then update that project status to close. 

4. /open is a command to reopen a previously closed project, when user type /open, it will list out all the closed projects, and user get to select which close project they want to open, after the user select, it will then update that project status to open.

Please ensure to update all the guides like /help, /start and so on to include this new feature. 

---------

# Webapp enhancement: /projects page

so in our current webapp, i want to add another menu on the left side bar called Projects.
⦁	When user click on the projects, it will go to the projects page. 
⦁	if there are no projects create, it will display an empty state that tell user to create a new project u can go to your telegram bot and type /new. and give some idea on what to use this project for. You can say like this project feature is typically use if you want to have expenses tracked that is for a specific reason like holiday, or an event and what not. 
⦁	If there are projects created for this user, it will display a list of projects, the design can copy the /transactions page, where by user can see each project, the columns include the created date, the project name, the currency, the no. of transactions, the total amount, the status, and the action where user can edit/ delete. 
⦁	edit basically user can edit the project name, the currency, and the status
⦁	delete, will display a second confirmation, if user confirm to delete it will then delete the project.

--------

# Webapp enhancement: /transactions page

⦁	so in the current /transactions page, i want to add another filter to filter projects, by default is all projects, and user can filter individual projects. 
⦁	for the amount columns for the transactions page, if is a general expense the currency can remain as $. but for other projects it will use the currency determined by the user. For example if the user has created a project with a currency called RM, then the amount column it will display as RM29.90

--------

# Webapp enhancement: /dashboard page
⦁	in the dashboard page, can also add a dropdown filter to allow user to filter the dashboard analytics based on projects. By default the filter is General, basically is what we have now, which are expenses that are not tied to any projects, then user can also filter to any of their created projects. 
⦁	if the user filter to a specific project the dashboard analytics will then calculate based on that specific project. Make sure the dashboard currency display is following the project currency.

Before you execute please tell me first what you understand about this, dont execute any code first, i want to see if to understand what i want to do, and u can ask any clarifiying question if you dont understand anything. Once i approve then only u can start.

