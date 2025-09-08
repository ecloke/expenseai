few changes i want to make 

1. i want to make the whole flow simpler. i think we can comment our the google sheet portion, no need to connect google sheet. but dont delete the code, if in the future we want to use it we can easily bring it back, so the user only need to connect telegram bot and also the google gemini. 

2. so this means that we need to save the data in our db. to make it simple we just need to save the receipt date, store name, the category and the total price. and this will be used for the telegram query. 

3. add the command for telegram which include the 
Basic Info Commands:

  - /start - Welcome + command list
  - /help - Show available commands
  - /stats - Quick monthly overview

  Time-based Commands:

  - /today - Today's expenses
  - /yesterday - Yesterday's expenses
  - /week - This week's total
  - /month - This month's total

4. only use gemini if user upload an image, if user type anything other than the command, tell the user to use the command instead. this will help to save the number of token. 

5. the dashboard need some upgrade, current the dashboard is not really a dashboard it doesnt show much useful data. i want it show more useful charts like a bar chart to show the total of daily spending, where user can filter between day, week, month. a pie chart to show what are the spending of each category, a list of the receipt rows, paginated. and so on. i think u can give some ideas on what sort of data is useful for users. 

6. the date needs to be fix, currently when i submit a receipt, u log this as today's transaction, but it shouldnt be like this, the data should follow the receipt date. wtv date u get from the receipt that should be the date of the transaction


before u start executing, plan first and let me know if u have any questions. i want to know your thoughts as well.

once i approve, then i want to write a PRP, like how we did for expense_tracker_spec.md. then after i read that then we can start. 