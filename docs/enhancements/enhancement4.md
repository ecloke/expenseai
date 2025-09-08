# new enhancement
so as you know our exepense tracker feature can only track user expenses, i want to add a new enhancement where user can also track income. how this works is basically similar like expenses, user can also record income. So that user can do a check how well they are managing their money. 

# how it works
so income also have its own categories, similar to expenses, so u can imagine the current expenses we have categories like dining, gas, entertainment, and so on. Income categories u can imagine is like Paybank, Salary, Cash Rebate and so on. 

so currently now we have an expenses table, im thinking we can just use the same table for income as well. im thinking maybe we can change the table name to transactions if that is possible instead of calling it expenses. And we add another column called "Type", this is to differeciate the transaction whether or not is expense or income. 

For this new enhancement, these are the areas that will be affected for the website and also telegram commands

Website
1. Transactions
2. Categories
3. Dashboard

Telegram commands
1. /create income
2. update all the commands to include income analytics for example /today, /month, /summary day, /summary month and so on.

## website

# transactions page
so for the website in the /transactions page.
1. add a create button that allows user to manually create a transaction. 
2. on click on create will display a popup dialog for user to create a transaction
3. user need to fill in the date, the transaction type whether is it an expense or income. after the user select the type, then only the user can select the categories, because expenses and income categories are different. for type expense, user can key in the store name and the amount. for type income, user can key in the Note, and amount. The note is just a front end display, but basically it is save under the same data field as the expense store name.
4. after user created it, it should display on the transaction page accordingly. 

# categories page
so for the categories page, we need to enhance it to be able to support the new income logic. Currently the categories are only for expenses. 
1. now user can tie the categories to either under expenses, or income. 
2. for the current categories that are already existed, will all be tied under expense.
3. in the categories page, user can filter categories that are under expenses, or categories that are under income
4. user able to see those default income categories
5. currently user can create their own categories by clicking the "Add Category" button. now for the add category, user only need to key in the category name. But for this new enhancement, user now also need to choose when adding this category is adding for expense type or income type. 
6. once add it should reflect automatically on the cateogories page.

# dashboard
for the dashboard im thinking to add one more analytic i think can be the same row as the Top Stores, can do a sort of like an income statement breakdown. so income statement on the left section, then the top store can move to the right section. So for this income statement is basically a display like for example 

Total Income       15000
    Salary          8000
    Freelance       7000
Total Expenses     20000
    Entertainment   2000
    Dining          3000
    Car Loan        2000
    House Loan      3000
    Medical        10000
Balance           -10000

Something like this, if u get what i mean? so i can see the total income, and then the break down of income categories, those that are more than 0. then total expenses, and the break down of each expenses category that are more than 0. then i can see what is the balance. 

For the dashboard currently it can only filter "This Week", "This Month", "All Time". I want to be able to filter "Today", "This Week", "This Month", "This Year", "All Time". And it will populate accordingly. Need to make sure follow the Malaysia timezone. 

## telegram
currently for telegram commands u can create expenses by typing /create 
1. i want another command called /create income, this is for user to create new income. the flow should be similar, where the user need to key in the date, then the Note, which is actually the store name. Select the income categories, and then the amount. 

### things to note
please make sure you read the existing code base, understand what has already been done. so that u dont keep repeating same codes. Check how the front end is being build, use same UI components to do it. read the DEPLOYMENT_BEST_PRACTICES.md, read the session-context.md understand how the telegram command works and how the current website works. 

REMEMBER NOT TO START CODING, DISCUSS WITH ME FIRST, UNTIL I APPROVE THEN ONLY U CAN START. 