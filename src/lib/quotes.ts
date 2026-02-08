export interface Quote {
  id: number
  text: string
  author: string
  category: 'motivation' | 'discipline' | 'focus' | 'success' | 'wisdom'
}

export const quotes: Quote[] = [
  // Motivation & Success
  { id: 1, text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier", category: "success" },
  { id: 2, text: "The only way to do great work is to love what you do.", author: "Steve Jobs", category: "success" },
  { id: 3, text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt", category: "motivation" },
  { id: 4, text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs", category: "wisdom" },
  { id: 5, text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson", category: "discipline" },
  { id: 6, text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt", category: "motivation" },
  { id: 7, text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe", category: "motivation" },
  { id: 8, text: "Success is not final, failure is not fatal: It is the courage to continue that counts.", author: "Winston Churchill", category: "success" },
  { id: 9, text: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis", category: "wisdom" },
  { id: 10, text: "Dream big and dare to fail.", author: "Norman Vaughan", category: "motivation" },
  
  // Discipline & Hard Work
  { id: 11, text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn", category: "discipline" },
  { id: 12, text: "We must all suffer from one of two pains: the pain of discipline or the pain of regret.", author: "Jim Rohn", category: "discipline" },
  { id: 13, text: "The only place where success comes before work is in the dictionary.", author: "Vidal Sassoon", category: "success" },
  { id: 14, text: "There are no shortcuts to any place worth going.", author: "Beverly Sills", category: "discipline" },
  { id: 15, text: "It's not about having time. It's about making time.", author: "Unknown", category: "discipline" },
  { id: 16, text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun", category: "discipline" },
  { id: 17, text: "Focus on being productive instead of busy.", author: "Tim Ferriss", category: "focus" },
  { id: 18, text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar", category: "motivation" },
  { id: 19, text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery", category: "discipline" },
  { id: 20, text: "Action is the foundational key to all success.", author: "Pablo Picasso", category: "success" },

  // Focus & Study
  { id: 21, text: "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus.", author: "Alexander Graham Bell", category: "focus" },
  { id: 22, text: "Starve your distractions and feed your focus.", author: "Unknown", category: "focus" },
  { id: 23, text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee", category: "focus" },
  { id: 24, text: "It always seems impossible until it's done.", author: "Nelson Mandela", category: "motivation" },
  { id: 25, text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela", category: "wisdom" },
  { id: 26, text: "The roots of education are bitter, but the fruit is sweet.", author: "Aristotle", category: "wisdom" },
  { id: 27, text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi", category: "wisdom" },
  { id: 28, text: "The expert in anything was once a beginner.", author: "Helen Hayes", category: "wisdom" },
  { id: 29, text: "Study while others are sleeping; work while others are loafing; prepare while others are playing; and dream while others are wishing.", author: "William Arthur Ward", category: "discipline" },
  { id: 30, text: "There is no substitute for hard work.", author: "Thomas Edison", category: "discipline" },

  // Resilience
  { id: 31, text: "Fall seven times and stand up eight.", author: "Japanese Proverb", category: "success" },
  { id: 32, text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius", category: "discipline" },
  { id: 33, text: "I find that the harder I work, the more luck I seem to have.", author: "Thomas Jefferson", category: "success" },
  { id: 34, text: "If you're going through hell, keep going.", author: "Winston Churchill", category: "motivation" },
  { id: 35, text: "Don't let yesterday take up too much of today.", author: "Will Rogers", category: "wisdom" },
  { id: 36, text: "You learn more from failure than from success. Don't let it stop you. Failure builds character.", author: "Unknown", category: "wisdom" },
  { id: 37, text: "If you can't fly then run, if you can't run then walk, if you can't walk then crawl, but whatever you do you have to keep moving forward.", author: "Martin Luther King Jr.", category: "motivation" },
  { id: 38, text: "Our greatest glory is not in never falling, but in rising every time we fall.", author: "Confucius", category: "success" },
  { id: 39, text: "Tough times never last, but tough people do.", author: "Robert H. Schuller", category: "motivation" },
  { id: 40, text: "Perseverance is failing 19 times and succeeding the 20th.", author: "Julie Andrews", category: "success" },

  // Ambition
  { id: 41, text: "The secret of getting ahead is getting started.", author: "Mark Twain", category: "motivation" },
  { id: 42, text: "Don't limit your challenges. Challenge your limits.", author: "Unknown", category: "motivation" },
  { id: 43, text: "Go the extra mile. It's never crowded there.", author: "Dr. Wayne D. Dyer", category: "success" },
  { id: 44, text: "Shoot for the moon. Even if you miss, you'll land among the stars.", author: "Les Brown", category: "motivation" },
  { id: 45, text: "Keep your eyes on the stars, and your feet on the ground.", author: "Theodore Roosevelt", category: "wisdom" },
  { id: 46, text: "If you want to achieve greatness stop asking for permission.", author: "Unknown", category: "motivation" },
  { id: 47, text: "I never dreamed about success. I worked for it.", author: "Estée Lauder", category: "success" },
  { id: 48, text: "Opportunities don't happen, you create them.", author: "Chris Grosser", category: "success" },
  { id: 49, text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown", category: "discipline" },
  { id: 50, text: "A river cuts through rock, not because of its power, but because of its persistence.", author: "Jim Watkins", category: "discipline" },

  // Learning & Growth
  { id: 51, text: "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.", author: "Brian Herbert", category: "wisdom" },
  { id: 52, text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin", category: "wisdom" },
  { id: 53, text: "Change is the end result of all true learning.", author: "Leo Buscaglia", category: "wisdom" },
  { id: 54, text: "Education is not the filling of a pail, but the lighting of a fire.", author: "William Butler Yeats", category: "wisdom" },
  { id: 55, text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King", category: "wisdom" },
  { id: 56, text: "Develop a passion for learning. If you do, you will never cease to grow.", author: "Anthony J. D'Angelo", category: "success" },
  { id: 57, text: "He who asks a question is a fool for five minutes; he who does not ask a question remains a fool forever.", author: "Chinese Proverb", category: "wisdom" },
  { id: 58, text: "Learning never exhausts the mind.", author: "Leonardo da Vinci", category: "wisdom" },
  { id: 59, text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss", category: "wisdom" },
  { id: 60, text: "Wisdom is not a product of schooling but of the lifelong attempt to acquire it.", author: "Albert Einstein", category: "wisdom" },

  // Mindset
  { id: 61, text: "Your attitude, not your aptitude, will determine your altitude.", author: "Zig Ziglar", category: "success" },
  { id: 62, text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford", category: "wisdom" },
  { id: 63, text: "Happiness is not something ready made. It comes from your own actions.", author: "Dalai Lama", category: "wisdom" },
  { id: 64, text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle", category: "wisdom" },
  { id: 65, text: "What you get by achieving your goals is not as important as what you become by achieving your goals.", author: "Zig Ziglar", category: "success" },
  { id: 66, text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis", category: "motivation" },
  { id: 67, text: "Act as if what you do makes a difference. It does.", author: "William James", category: "motivation" },
  { id: 68, text: "Keep your face always toward the sunshine—and shadows will fall behind you.", author: "Walt Whitman", category: "wisdom" },
  { id: 69, text: "Believe in yourself and all that you are. Know that there is something inside you that is greater than any obstacle.", author: "Christian D. Larson", category: "motivation" },
  { id: 70, text: "The mind is everything. What you think you become.", author: "Buddha", category: "wisdom" },

  // Short & Punchy
  { id: 71, text: "Dream it. Wish it. Do it.", author: "Unknown", category: "motivation" },
  { id: 72, text: "Stay hungry. Stay foolish.", author: "Steve Jobs", category: "motivation" },
  { id: 73, text: "One day or day one. You decide.", author: "Unknown", category: "discipline" },
  { id: 74, text: "Do it with passion or not at all.", author: "Unknown", category: "motivation" },
  { id: 75, text: "Mistakes are proof that you are trying.", author: "Unknown", category: "wisdom" },
  { id: 76, text: "No pressure, no diamonds.", author: "Thomas Carlyle", category: "success" },
  { id: 77, text: "Make it happen.", author: "Unknown", category: "motivation" },
  { id: 78, text: "Prove them wrong.", author: "Unknown", category: "motivation" },
  { id: 79, text: "Don't quit.", author: "Unknown", category: "discipline" },
  { id: 80, text: "Focus on the goal.", author: "Unknown", category: "focus" },

  // Student Specific
  { id: 81, text: "The pain you feel today is the strength you feel tomorrow.", author: "Unknown", category: "discipline" },
  { id: 82, text: "Study hard, for the well is deep, and our brains are shallow.", author: "Richard Baxter", category: "wisdom" },
  { id: 83, text: "There are no secrets to success. It is the result of preparation, hard work, and learning from failure.", author: "Colin Powell", category: "success" },
  { id: 84, text: "Self-belief and hard work will always earn you success.", author: "Virat Kohli", category: "success" },
  { id: 85, text: "However difficult life may seem, there is always something you can do and succeed at.", author: "Stephen Hawking", category: "motivation" },
  { id: 86, text: "If you can dream it, you can do it.", author: "Walt Disney", category: "motivation" },
  { id: 87, text: "A little progress each day adds up to big results.", author: "Unknown", category: "success" },
  { id: 88, text: "The best way to predict the future is to create it.", author: "Peter Drucker", category: "wisdom" },
  { id: 89, text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair", category: "motivation" },
  { id: 90, text: "Work hard in silence, let your success be your noise.", author: "Frank Ocean", category: "success" },

  // Exams & Pressure
  { id: 91, text: "Don't stress. Do your best. Forget the rest.", author: "Unknown", category: "wisdom" },
  { id: 92, text: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill", category: "success" },
  { id: 93, text: "Every morning you have two choices: continue to sleep with your dreams, or wake up and chase them.", author: "Unknown", category: "motivation" },
  { id: 94, text: "Don't wish it were easier. Wish you were better.", author: "Jim Rohn", category: "wisdom" },
  { id: 95, text: "Push yourself, because no one else is going to do it for you.", author: "Unknown", category: "discipline" },
  { id: 96, text: "Some people want it to happen, some wish it would happen, others make it happen.", author: "Michael Jordan", category: "success" },
  { id: 97, text: "Great things never came from comfort zones.", author: "Unknown", category: "motivation" },
  { id: 98, text: "It's going to be hard, but hard does not mean impossible.", author: "Unknown", category: "wisdom" },
  { id: 99, text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown", category: "discipline" },
  { id: 100, text: "You are capable of more than you know.", author: "Glinda the Good Witch", category: "motivation" },
  { id: 101, text: "Your only limit is you.", author: "Unknown", category: "motivation" },
  { id: 102, text: "Stop doubting yourself. Work hard and make it happen.", author: "Unknown", category: "motivation" },
  { id: 103, text: "Do something today that your future self will thank you for.", author: "Unknown", category: "discipline" },
]
