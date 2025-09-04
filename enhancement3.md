# new enhancement
I want to enhance the category function, currently now the category have a fix number of category for user to choose from, like dining, gas, pharmacy, retail and so on. What i want to do is to allow user to manage their categories, user can edit/ delete/ create categories. 

# problem
Currently our categories are pre defined, this is an issue because, user might wnat to have their own category, and they might also want to have their own naming convention for their categories. Since is pre defined, it is very limited in terms of user experience, because there is not much flexibility. 

# Proposed solution
im thinking to add another side menu bar called category, so this is basically where the user will manage all their categories. since we already have existing user expense data that already has category tied to it, we need to make sure existing data will not be affected. So when user click on the category page, it should already have the list of categories which is the pre-defined one that we have currently. and for those existing category, user can edit the name of those categories. User can also delete category, BUT only can delete category that have no transactions. 

User can create new category, when click on create it will diplay a dialog popup for user to create new category. For the new category user just need to key in name of the category, which is a required field. After creation then the dialog will close, and user will get the to see the category create in the main category page. 

# things to note
1. any edit, delete, creation of category need to make sure the telegram bot also will have those category, as you remembered, when user do /create command on telegram they need to choose a category, make sure it is following the manage category list. 
2. In the dashboard, need to make sure the analytics is displaying the category from the category list and is not hard coded. 


Please DO NOT start coding first, i need you to read this carefully, and tell me your proposed plan first.