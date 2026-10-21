/* Nine English — Pre-Board objective + subjective catalog blocks (idempotent). Catalog only. */
SET NOCOUNT ON;

DECLARE @Ch int =
(
    SELECT TOP (1) c.Id
    FROM dbo.Chapters c
    INNER JOIN dbo.Subject s ON s.Id = c.SubjectId
    INNER JOIN dbo.Class cl ON cl.Id = c.ClassId
    WHERE LOWER(LTRIM(RTRIM(cl.ClassName))) LIKE N'nine%'
      AND LOWER(LTRIM(RTRIM(s.SubjectName))) IN (N'english', N'eng')
    ORDER BY c.ChapterNo, c.Id
);

DECLARE @ChDaffodils int =
(
    SELECT TOP (1) c.Id
    FROM dbo.Chapters c
    INNER JOIN dbo.Subject s ON s.Id = c.SubjectId
    INNER JOIN dbo.Class cl ON cl.Id = c.ClassId
    WHERE LOWER(LTRIM(RTRIM(cl.ClassName))) LIKE N'nine%'
      AND LOWER(LTRIM(RTRIM(s.SubjectName))) IN (N'english', N'eng')
      AND c.ChapterNo = 3
    ORDER BY c.Id
);

IF @Ch IS NULL
    THROW 50001, 'Class Nine English chapter not found.', 1;

IF @ChDaffodils IS NULL SET @ChDaffodils = @Ch;

/* --- Objective Q1 (a) verb --- */
UPDATE dbo.QuestionsCatalog
SET Type = N'mcq', Category = N'exercise', BodyJson = N'{"items":[{"text":"The sun ______ in the west.","options":["sets","set","is set","was set"]},{"text":"We ______ to the market yesterday.","options":["go","went","gone","going"]},{"text":"She ______ English for five years.","options":["study","studies","has studied","studying"]},{"text":"They ______ football now.","options":["play","plays","are playing","played"]},{"text":"He ______ the letter by tomorrow.","options":["writes","wrote","will write","writing"]}]}'
WHERE ChapterId = @Ch AND StructureKind = N'choice-set' AND DescriptionText = N'Choose the correct form of verb.';

IF @@ROWCOUNT = 0 AND NOT EXISTS (
    SELECT 1 FROM dbo.QuestionsCatalog WHERE ChapterId = @Ch AND StructureKind = N'choice-set' AND DescriptionText = N'Choose the correct form of verb.')
INSERT INTO dbo.QuestionsCatalog (Type, Category, ChapterId, DescriptionText, StructureKind, BodyJson)
VALUES (N'mcq', N'exercise', @Ch, N'Choose the correct form of verb.', N'choice-set',
N'{"items":[{"text":"The sun ______ in the west.","options":["sets","set","is set","was set"]},{"text":"We ______ to the market yesterday.","options":["go","went","gone","going"]},{"text":"She ______ English for five years.","options":["study","studies","has studied","studying"]},{"text":"They ______ football now.","options":["play","plays","are playing","played"]},{"text":"He ______ the letter by tomorrow.","options":["writes","wrote","will write","writing"]}]}');

/* --- Objective Q1 (b) spelling --- */
UPDATE dbo.QuestionsCatalog
SET Type = N'mcq', Category = N'exercise', BodyJson = N'{"rows":[{"options":["Rhythm","Rhythem","Rythem","Rythm"]},{"options":["Restaurant","Resturant","Restarant","Restaurent"]},{"options":["Confusion","Confution","Confusian","Confushion"]},{"options":["Protection","Protectian","Protaction","Protecton"]}]}'
WHERE ChapterId = @Ch AND StructureKind = N'spelling-table' AND DescriptionText = N'Choose the correct spelling.';

IF @@ROWCOUNT = 0 AND NOT EXISTS (
    SELECT 1 FROM dbo.QuestionsCatalog WHERE ChapterId = @Ch AND StructureKind = N'spelling-table' AND DescriptionText = N'Choose the correct spelling.')
INSERT INTO dbo.QuestionsCatalog (Type, Category, ChapterId, DescriptionText, StructureKind, BodyJson)
VALUES (N'mcq', N'exercise', @Ch, N'Choose the correct spelling.', N'spelling-table',
N'{"rows":[{"options":["Rhythm","Rhythem","Rythem","Rythm"]},{"options":["Restaurant","Resturant","Restarant","Restaurent"]},{"options":["Confusion","Confution","Confusian","Confushion"]},{"options":["Protection","Protectian","Protaction","Protecton"]}]}');

/* --- Objective Q1 (c) vocabulary --- */
IF NOT EXISTS (
    SELECT 1 FROM dbo.QuestionsCatalog WHERE ChapterId = @Ch AND StructureKind = N'choice-set' AND DescriptionText = N'Choose the correct option.')
INSERT INTO dbo.QuestionsCatalog (Type, Category, ChapterId, DescriptionText, StructureKind, BodyJson)
VALUES (N'mcq', N'exercise', @Ch, N'Choose the correct option.', N'choice-set',
N'{"items":[{"text":"What is the synonym for \"compassion\"?","options":["kindness","cruelty","anger","pride"]},{"text":"What is the antonym of \"eradicate\"?","options":["destroy","remove","plant","spread"]},{"text":"Choose the synonym of \"solitude\".","options":["loneliness","crowd","noise","party"]},{"text":"Choose the antonym of \"vacant\".","options":["empty","occupied","open","wide"]},{"text":"What is the synonym of \"significant\"?","options":["important","tiny","weak","silent"]}]}');

/* --- Objective Q1 (d) grammar --- */
IF NOT EXISTS (
    SELECT 1 FROM dbo.QuestionsCatalog WHERE ChapterId = @Ch AND StructureKind = N'choice-set' AND DescriptionText = N'Choose the correct option according to grammar.')
INSERT INTO dbo.QuestionsCatalog (Type, Category, ChapterId, DescriptionText, StructureKind, BodyJson)
VALUES (N'mcq', N'exercise', @Ch, N'Choose the correct option according to grammar.', N'choice-set',
N'{"items":[{"text":"She wore a blue dress. The underlined adjective is:","options":["qualitative","quantitative","demonstrative","possessive"]},{"text":"Swimming is good for health. The underlined word is a:","options":["gerund","participle","infinitive","noun"]},{"text":"He is as brave as a lion. This is an example of:","options":["simile","metaphor","personification","irony"]},{"text":"He ran fast because he was late. The underlined word is a:","options":["conjunction","preposition","adverb","pronoun"]},{"text":"The book on the table is mine. The underlined word is a:","options":["preposition","conjunction","adverb","verb"]}]}');

/* --- Subjective Q2(a) --- */
IF NOT EXISTS (
    SELECT 1 FROM dbo.QuestionsCatalog WHERE ChapterId = @Ch AND StructureKind = N'passage-set' AND DescriptionText = N'Answer any three of the following questions.')
INSERT INTO dbo.QuestionsCatalog (Type, Category, ChapterId, DescriptionText, StructureKind, BodyJson)
VALUES (N'laq', N'exercise', @Ch, N'Answer any three of the following questions.', N'passage-set',
N'{"passages":[],"questions":[{"text":"How did Hazrat Muhammad (SAW) prove himself an honest and trustworthy person?"},{"text":"What message did Hazrat Asma (RA) convey through her life?"},{"text":"How can Pakistani students contribute to the progress of the country?"},{"text":"What is the importance of time management in student life?"},{"text":"Why is globalization both an opportunity and a challenge for Pakistan?"}]}');

/* --- Subjective Q2(b) --- */
IF NOT EXISTS (
    SELECT 1 FROM dbo.QuestionsCatalog WHERE ChapterId = @Ch AND StructureKind = N'passage-set' AND DescriptionText = N'Answer any one of the following questions.')
INSERT INTO dbo.QuestionsCatalog (Type, Category, ChapterId, DescriptionText, StructureKind, BodyJson)
VALUES (N'laq', N'exercise', @Ch, N'Answer any one of the following questions.', N'passage-set',
N'{"passages":[],"questions":[{"text":"How does Stanley Houghton organise the sequence of events in The Dear Departed to build tension and reveal the characters'' true motives?"},{"text":"How does the conflict over Mr. Merryweather''s possessions drive the plot of the play? What does the conflict reveal about the characters'' values and priorities?"}]}');

/* --- Subjective Q3 translation EN to Urdu --- */
IF NOT EXISTS (
    SELECT 1 FROM dbo.QuestionsCatalog WHERE ChapterId = @Ch AND StructureKind = N'passage-set' AND DescriptionText = N'Translate any two of the following paragraphs into Urdu.')
INSERT INTO dbo.QuestionsCatalog (Type, Category, ChapterId, DescriptionText, StructureKind, BodyJson)
VALUES (N'laq', N'exercise', @Ch, N'Translate any two of the following paragraphs into Urdu.', N'passage-set',
N'{"passages":[{"label":"a","text":"When the revelation of the divine message began, Rasoolullah (SAW) proclaimed the Oneness of Allah (Tauheed) and invited people to worship Allah alone. He taught honesty, justice and compassion in daily life."},{"label":"b","text":"Taseer told his class about time management. He placed big rocks in a jar first, then pebbles, then sand. The lesson was simple: do important tasks first, then smaller ones."},{"label":"c","text":"Globalisation has affected Pakistan''s economy and culture. It brings new opportunities but also challenges. We must balance national identity with economic progress."}],"questions":[]}');

/* --- Subjective Q4 summary (Daffodils chapter) --- */
IF NOT EXISTS (
    SELECT 1 FROM dbo.QuestionsCatalog WHERE ChapterId = @ChDaffodils AND StructureKind = N'prompt' AND DescriptionText = N'Write down the Summary of the poem ''Daffodils'' Written by William Wordsworth.')
INSERT INTO dbo.QuestionsCatalog (Type, Category, ChapterId, DescriptionText, StructureKind, BodyJson)
VALUES (N'laq', N'exercise', @ChDaffodils, N'Write down the Summary of the poem ''Daffodils'' Written by William Wordsworth.', N'prompt',
N'{"note":""}');

/* --- Subjective Q5 idioms --- */
IF NOT EXISTS (
    SELECT 1 FROM dbo.QuestionsCatalog WHERE ChapterId = @Ch AND StructureKind = N'word-list' AND DescriptionText = N'Use any five of the following words/phases/idioms in your sentences.')
INSERT INTO dbo.QuestionsCatalog (Type, Category, ChapterId, DescriptionText, StructureKind, BodyJson)
VALUES (N'laq', N'exercise', @Ch, N'Use any five of the following words/phases/idioms in your sentences.', N'word-list',
N'{"words":["Dilemma","Grow up","Pensive","Resolute faith","Adored","Break the cycle","Advocate"]}');

/* --- Subjective Q6 letter --- */
UPDATE dbo.QuestionsCatalog
SET Type = N'laq', Category = N'exercise', BodyJson = N'{"note":""}'
WHERE ChapterId = @Ch AND StructureKind = N'prompt' AND DescriptionText = N'Write a letter to your friend condoling the death of his mother.';

IF @@ROWCOUNT = 0 AND NOT EXISTS (
    SELECT 1 FROM dbo.QuestionsCatalog WHERE ChapterId = @Ch AND StructureKind = N'prompt' AND DescriptionText = N'Write a letter to your friend condoling the death of his mother.')
INSERT INTO dbo.QuestionsCatalog (Type, Category, ChapterId, DescriptionText, StructureKind, BodyJson)
VALUES (N'laq', N'exercise', @Ch, N'Write a letter to your friend condoling the death of his mother.', N'prompt', N'{"note":""}');

/* --- Subjective Q7 comprehension --- */
IF NOT EXISTS (
    SELECT 1 FROM dbo.QuestionsCatalog WHERE ChapterId = @Ch AND StructureKind = N'passage-set' AND DescriptionText = N'Read the following paragraph and answer the questions given below.')
INSERT INTO dbo.QuestionsCatalog (Type, Category, ChapterId, DescriptionText, StructureKind, BodyJson)
VALUES (N'laq', N'exercise', @Ch, N'Read the following paragraph and answer the questions given below.', N'passage-set',
N'{"passages":[{"label":"","text":"Milk is often preserved by turning it into powdered milk. The water is removed and the thick part is left. From this thick part people make cream and butter. Skim milk is what remains after the cream is taken away."}],"questions":[{"text":"Is the milk in tins powdered or liquid?"},{"text":"What becomes of the water in the milk?"},{"text":"What does the thick part of the milk have in it?"},{"text":"What is cream?"},{"text":"What do people make from cream?"}]}');

/* --- Subjective Q8 Urdu to English --- */
IF NOT EXISTS (
    SELECT 1 FROM dbo.QuestionsCatalog WHERE ChapterId = @Ch AND StructureKind = N'word-list' AND DescriptionText = N'Translate any five of the following sentences into English.')
INSERT INTO dbo.QuestionsCatalog (Type, Category, ChapterId, DescriptionText, StructureKind, BodyJson)
VALUES (N'laq', N'exercise', @Ch, N'Translate any five of the following sentences into English.', N'word-list',
N'{"words":["نیک عورت نے یتیم بچوں کی پرورش کی۔","انہوں نے گمشدہ بچے کی تلاش نہیں کی ہے۔","استاد آٹھ بجے سے پڑھا رہا ہے۔","جو محنت کرتا ہے، اس کا پھل پاتا ہے۔","امیر غریبوں کی مدد کرے گا۔","علم حاصل کرنا ہر مسلمان پر فرض ہے۔","صبر کا پھل میٹھا ہوتا ہے۔"]}');

/* --- Subjective Q9 voice --- */
UPDATE dbo.QuestionsCatalog
SET Type = N'laq', Category = N'exercise',
    DescriptionText = N'Change the voice of the followings.',
    BodyJson = N'{"pairs":[{"left":"The snake will have been killed by us.","right":"—"},{"left":"They have bought a horse.","right":"—"},{"left":"She likes apples.","right":"—"},{"left":"He took away my books.","right":"—"},{"left":"We shall have finished our work by March next.","right":"—"}]}'
WHERE ChapterId = @Ch AND StructureKind = N'sentence-pair' AND DescriptionText IN (N'Change the voice of the following.', N'Change the voice of the followings.');

IF @@ROWCOUNT = 0 AND NOT EXISTS (
    SELECT 1 FROM dbo.QuestionsCatalog WHERE ChapterId = @Ch AND StructureKind = N'sentence-pair' AND DescriptionText = N'Change the voice of the followings.')
INSERT INTO dbo.QuestionsCatalog (Type, Category, ChapterId, DescriptionText, StructureKind, BodyJson)
VALUES (N'laq', N'exercise', @Ch, N'Change the voice of the followings.', N'sentence-pair',
N'{"pairs":[{"left":"The snake will have been killed by us.","right":"—"},{"left":"They have bought a horse.","right":"—"},{"left":"She likes apples.","right":"—"},{"left":"He took away my books.","right":"—"},{"left":"We shall have finished our work by March next.","right":"—"}]}');

SELECT StructureKind, DescriptionText, LEN(BodyJson) AS BodyLen
FROM dbo.QuestionsCatalog
WHERE ChapterId IN (@Ch, @ChDaffodils)
  AND StructureKind <> N'standard'
ORDER BY StructureKind, DescriptionText;
