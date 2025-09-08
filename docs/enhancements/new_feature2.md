# new feature
i want to add another new feature on to my expense tracker, this is going to be a fun feature, nothing related to expenses but i want my user to have some fun. Basically it is fortune telling. So as you know, my logged in users already provided their gemini api key, so we can use their AI not just for receipt analysing, but we can utilize this for this fun feature as well. 

im thinking the feature is going to be something like this
1. a new side bar menu called fortune telling. 
2. on click the fortune telling will go to a new page /fortune-telling. 
3. this page only can be accessed by logged in user, if the user manually key in the url without logging in, it will redirect user back to the login page. 
4. in this page the user will need to fill in their date of birth (YYYY-MM-DD), time of birth (HH:MM), Place of birth (City, Country). for the city and the country to make it simple, allow user to type free text. 
5. after the user key in, then in the backend will give the gemini the prompt 

"You are a master fortune teller. Analyze the given birth details using the most accurate methods (BaZi/Four Pillars of Destiny, astrology, numerology, or other suitable systems). Provide insights that are straightforward, specific, and practical. Cover career, wealth, relationships, health, personality, and major life events/timings. Be clear and structured, avoid repeating or overexplaining. Do not waste words—deliver the essence directly.

Input:
- Date of Birth: {user date of birth}
- Time of Birth: {user time of birth}
- Place of Birth: {user city}, {user country}

Output format:
- Personality & Core Traits
- Career Path
- Wealth & Financial Outlook
- Relationships & Family
- Health Tendencies
- Key Life Periods / Turning Points
- Practical Advice

# things to note
I want the UI/UX to be interactive, i dont want it to be the typical design, i want it to be fun and engageing, make it oriental style. I want it to be totally different from what we currently have for the UI, use red, white, yellow, like those oriental colors.

Make sure you dont start coding yet. Lets discuss first, tell me your plan. and how u going to execute it. 