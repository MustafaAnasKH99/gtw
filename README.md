# Guess The Word Game

each round, the game selects a random secret word from the database. The user enters a random word and the game calculates how close it is to the secret word in comparison to other words in the db (cosine similarity). The user keeps entering words until they guess the secret one. The lower the score of a word the closer it is to the secret one. The game should have a /guess endpoint that verifies the word is in the database, calculates its closeness to the secret word, then sends that back to the user.

## Steps
- Extract a list of unique english words (final_words.txt)
- Settle on a suitable database solution
- Generate embeddings for each word in the final_words.txt
- Create the server with the proper end points
- test calculating the distance between words.