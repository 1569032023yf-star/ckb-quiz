/* eslint-disable */
/**
 * 生成 tools/patch_en2025.json
 * 内容来源：2025年专升本真题及答案解析（英语）.pdf
 *   —— 第1~6页（试卷正文，裁边+二值化后重新 OCR 并逐页人工核对）
 *   —— 第11~12页（官方参考答案与解析）
 * 用途：修复 2025 年英语被装订线竖排文字/背面透印污染的全部题干、选项、原文，
 *       并补上官方阅读解析。只覆盖下列字段，不动 answer / id / chapter / no。
 */
const fs = require("fs");
const path = require("path");

const O = (a, b, c, d) => [
  { key: "A", text: a }, { key: "B", text: b },
  { key: "C", text: c }, { key: "D", text: d },
];
const PH = (a, b, c, d) => ({
  question: "选出划线部分读音与其他三个不同的一项：\nA. " + a + " / B. " + b + " / C. " + c + " / D. " + d,
  options: O(a, b, c, d),
});

const patch = {};

/* ---------------- I. Phonetics 1~5 ---------------- */
Object.assign(patch, {
  "en2025-1": { ...PH("arise", "brick", "pride", "child"), explanation: "参考答案：B" },
  "en2025-2": { ...PH("head", "beam", "leaf", "heat"), explanation: "参考答案：A" },
  "en2025-3": { ...PH("cow", "how", "low", "now"), explanation: "参考答案：C" },
  "en2025-4": { ...PH("tooth", "smooth", "wealth", "truth"), explanation: "参考答案：B" },
  "en2025-5": { ...PH("answer", "absence", "escape", "disease"), explanation: "参考答案：D" },
});

/* ---------------- II. Vocabulary and Structure 6~20 ---------------- */
const V = (q, o, ans) => ({ question: q, options: O(...o), explanation: "参考答案：" + ans });

Object.assign(patch, {
  "en2025-6": V("Let's celebrate the victory of our team in the sports meeting, ______?",
    ["do you", "do we", "will you", "shall we"], "D"),
  "en2025-7": V("______ is late for the examination will not be allowed to enter the classroom.",
    ["Whoever", "Who", "Whom", "No matter who"], "A"),
  "en2025-8": V("______ the project on time, they had to work late into the night for several days.",
    ["Complete", "Completed", "To complete", "Completing"], "C"),
  "en2025-9": V("— Where do you usually have your hair ______?\n— At the barber's near the grocery.",
    ["cut", "be cut", "cutting", "to cut"], "A"),
  "en2025-10": V("In the digital era, it is very important not to ______ personal information on the Internet.",
    ["try out", "give out", "pick out", "keep out"], "B"),
  "en2025-11": V("With more colleagues to help you with the task, you will be relieved ______ pressure.",
    ["by", "of", "against", "to"], "B"),
  "en2025-12": V("I cannot afford a dinner in that fancy restaurant. Let's try a ______ expensive one.",
    ["most", "more", "least", "less"], "D"),
  "en2025-13": V("Writing poetry about country life ______ her from the boredom of everyday life.",
    ["reminded", "benefited", "liberated", "persuaded"], "C"),
  "en2025-14": V("______ there was no obvious evidence against him, most people thought he was guilty.",
    ["Unless", "If", "While", "Because"], "C"),
  "en2025-15": V("He ______ at the company for five years before he was promoted to a management position.",
    ["had worked", "has worked", "was working", "will have worked"], "A"),
  "en2025-16": V("The decision finally came from the manager ______ all staff should work extra hours.",
    ["when", "which", "what", "that"], "D"),
  "en2025-17": V("Paul's poor performance in the interview was a big ______ to his mother, who had wanted her son to study at Harvard University.",
    ["act", "blow", "sign", "air"], "B"),
  "en2025-18": V("She is the only one in the office ______ can speak English fluently.",
    ["which", "whose", "where", "who"], "D"),
  "en2025-19": V("With the help of the ______ glasses, people now can have a virtual tour of the museums around the world while sitting at home.",
    ["smart", "neat", "mobile", "old"], "A"),
  "en2025-20": V("The doctor strongly recommends that the patient ______ a strict diet to keep healthy.",
    ["following", "followed", "follow", "to follow"], "C"),
});

/* ---------------- III. Cloze 21~35 ---------------- */
const clozePassage =
  "For each blank in the following passage, there are four choices marked A, B, C and D. " +
  "Choose the one that is most suitable and mark your answer by blackening the corresponding letter on the Answer Sheet.\n\n" +
  "With over a decade of teaching, Mrs Bishop has many special memories of her students. " +
  "But one story in particular stands ____(21).\n\n" +
  "\"I taught Jerushi in 2013,\" Mrs Bishop ____(22). \"She was in Australia alone. Her parents had ____(23) " +
  "behind in her home country.\" Mrs Bishop supported Jerushi during Year 6 and encouraged her love of ____(24). " +
  "A year later, she gave Mrs Bishop a beautiful landscape artwork she had painted.\n\n" +
  "Jerushi studied in Australia for ____(25) few years, but Mrs Bishop lost touch with her. ____(26) she went back home. " +
  "Then, a few years ago, Jerushi ____(27) out to Mrs Bishop. At the time, Jerushi's painting was ____(28) above " +
  "Mrs Bishop's desk—proof that Mrs Bishop had ____(29) forgotten her. \"Jerushi told me she was now studying to ____(30), " +
  "a teacher just like me,\" Mrs Bishop says. \"It was a beautiful message. As a teacher, you often don't realise the kind of " +
  "____(31) you can have.\"\n\n" +
  "It was a full-circle moment for Mrs Bishop, who remembers ____(32) her own teacher a letter five years ago with a " +
  "____(33) message, saying she started her teaching career because of him. \"His passion ____(34) teaching really inspired me.\" " +
  "For Mrs Bishop, teaching is both a pleasure and a privilege. \"When parents thank me, I ____(35) them, 'No, thank you for " +
  "allowing me to be a part of your child's life.'\"";

const clozeOpts = {
  21: ["up", "out", "on", "by"], 22: ["argues", "recalls", "suggests", "repeats"],
  23: ["gone", "hidden", "stayed", "looked"], 24: ["sport", "maths", "music", "art"],
  25: ["another", "too", "every", "so"], 26: ["although", "unless", "once", "until"],
  27: ["reached", "checked", "called", "moved"], 28: ["installing", "hanging", "locating", "ranking"],
  29: ["since", "ever", "just", "never"], 30: ["become", "train", "find", "respect"],
  31: ["duty", "impact", "fight", "hope"], 32: ["lending", "promising", "writing", "ordering"],
  33: ["similar", "previous", "secret", "vague"], 34: ["by", "among", "for", "without"],
  35: ["ask", "warn", "advise", "tell"],
};
const clozeAns = { 21: "B", 22: "B", 23: "C", 24: "D", 25: "A", 26: "C", 27: "A", 28: "B", 29: "D", 30: "A", 31: "B", 32: "C", 33: "A", 34: "C", 35: "D" };
for (let n = 21; n <= 35; n++) {
  patch["en2025-" + n] = {
    options: O(...clozeOpts[n]),
    passage: clozePassage,
    explanation: "参考答案：" + clozeAns[n],
  };
}

/* ---------------- IV. Reading 36~55 ---------------- */
const p1 =
  "Last week, a friend from Colorado, who I first met in Thailand, came into town for his sister's graduation. " +
  "He called me and we met up in a bar. It was one of the best nights of the summer.\n\n" +
  "We retold stories from our time in Thailand, drank a couple beers, and just reflected in the presence of one another. " +
  "And the best part: he was doing well, succeeding in life while pursuing his dreams.\n\n" +
  "On my way home from seeing him on his last night in town, I got a little depressed. I just forgot how much fun I had " +
  "with him and why he made my Thailand experience so awesome. And that of course got me missing all my friends: the ones " +
  "still in Santa Clara, the ones following their music careers, the ones living in Portland that I have just been too dumb " +
  "to contact. I have just been so caught up in writing, studying for the GRE, lounging about my house, that I haven't made " +
  "the effort that I certainly should have.\n\n" +
  "Sometimes, we get so absorbed in our own lives that we forget what makes our lives worth living. Humans are social creatures. " +
  "It is in our DNA. Evolutionary psychologists suggest that because we relied upon social groups in primitive times to survive, " +
  "we have a negative biological reaction to loneliness today.\n\n" +
  "So go out there and contact a friend you haven't talked to for a while. If nothing else, just check in to see how they're doing. " +
  "Because even if you haven't spoken for a while, I'm certain that they are thinking of you.";

const p2 =
  "Seagulls(海鸥) don't just steal food from tourists; they also make quite a mess on the boats of the Australian National " +
  "Maritime Museum. Seagull droppings stain the boats, causing the museum staff to spend many hours cleaning up the mess " +
  "left by the seagulls.\n\n" +
  "After many failed attempts at keeping the annoying seagulls away, the staff had a brilliant idea. Inspired by the method " +
  "used at various airports to drive away wildlife, they sought out the Australian Dog Working Centre and adopted Bailey. " +
  "The three-year-old dog was appointed the new position of Assistant Director of Seagulls and put to work.\n\n" +
  "The highlight of Bailey's morning is chasing the seagulls away from the boats. For the first few weeks, Bailey was a little " +
  "too enthusiastic about his new role and managed to jump into the water during the pursuit of seagulls. But it wasn't long " +
  "before he was fitted with a new work uniform—a bright yellow life vest that keeps him floating on water. Bailey even has a " +
  "special staff ID with his photo and the title of his important position. He has had to get familiar with the museum's " +
  "waterfront, which he patrols(巡查) frequently. This is especially important at night when there is no human activity around " +
  "to scare the seagulls off.\n\n" +
  "The museum staff members are all very fond of Bailey, making sure to give him lots of playtime, walks and affection. " +
  "He is very well taken care of, with visits to the local animal doctor for grooming(梳毛) scheduled every two weeks.\n\n" +
  "When he is clocked on, Bailey prefers not to be disturbed so he can focus on his job. However, when he is not working, the " +
  "museum encourages all visitors to come to say hello to their special employee. So the next time you visit the museum, " +
  "make sure to say hello to this hardworking dog!";

const p3 =
  "The recent wildfire in Alberta, Canada, has already burned through 600 square miles of land, and 20% of houses in the city " +
  "of Fort McMurray; all its 88,000 residents have left their homes. But how do you put out fires this big and intense?\n\n" +
  "Wind, fuel and the slope(坡度) of the land are three vital factors. You can't do very much about the first one. The " +
  "firefighters will be paying attention to weather conditions. In an ideal world, the wind would force the flames back on to " +
  "ground that has already been burned.\n\n" +
  "Fuel—mainly the trees—can be managed in several ways, such as bulldozing(铲除) it out of the way or starting controlled " +
  "fires to burn it off so it can't feed the main fire.\n\n" +
  "The slope of the land can also help. Fires burn much more aggressively going uphill than they do downhill. You don't try to " +
  "fight a fire going uphill. The firefighters will be looking very carefully how they arrange their personnel and equipment on " +
  "a downhill side of a slope. In a fire that is relatively small and moving downhill, you can launch a direct attack, physically " +
  "beating the flames out with special tools. You would come in behind the fire, so you're not face to face with flames coming " +
  "towards you.\n\n" +
  "In addition, fire can spread a large distance away from the fire-front by burning embers(余火) carried on the wind, which " +
  "then start other fires elsewhere. You can actively work on preventing parts of the fire going in certain directions. But this " +
  "requires resources, such as water bombers—planes that can dump vast quantities of water. They aren't just flying over the top " +
  "of the fire and releasing water. They usually wet the fuel ahead of the fire or along its sides to stop the spread of the fire.";

const p4 =
  "Pittsburgh Arlington, an elementary school in the state of Pennsylvania, is battling chronic absence from school with a " +
  "community-centered approach that combines care, connection, and practical support. Over half of the school's 353 students " +
  "frequently miss classes. Many of these students face barriers like a lack of transportation, which the school district does " +
  "not provide for those living less than a mile and a half away.\n\n" +
  "To tackle this issue, the school worked with the Brashear Association, a local nonprofit, to launch the nanas(保姆) program. " +
  "This initiative provides a personal touch, where nanas make cheerful morning wake-up calls to families, often ending the " +
  "conversation with a heartfelt \"I love you.\" In addition, the program offers free bus rides to and from school, ensuring that " +
  "children who might otherwise miss school can attend regularly.\n\n" +
  "The program currently serves 36 children daily, but demand is high, with about 20 students still on the waitlist. Principal " +
  "Crystal Caldwell wishes there were more resources to expand the service. Meanwhile, the school is also working on other " +
  "solutions, like paying staff to walk students home and working together with a nearby church to offer before-school care.\n\n" +
  "These efforts are part of a broader initiative aiming at making school a friendly and desirable place for students. This " +
  "includes working with local arts organizations to create interesting programs and offering regular motivational talks to " +
  "encourage attendance(出勤). These combined efforts reflect a deep understanding that the causes are complex and varied, " +
  "requiring the entire community's involvement to address them effectively.\n\n" +
  "Tiffini Gorman, director of partnerships at the nonprofit A+ Schools, emphasizes the importance of collective responsibility " +
  "in ensuring that every child has the support they need to succeed. The school's approach highlights the significance of " +
  "community involvement in creating a positive and supportive environment for students.";

const p5 =
  "Counting butterflies can reduce anxiety and boost a sense of connection with nature, a study has found. Researchers surveyed " +
  "participants in the Big Butterfly Count in 2022, in which wildlife charity Butterfly Conservation encouraged people to spend " +
  "15 minutes outside counting butterflies to help scientists track how the insects were faring. Surveys completed by 382 people " +
  "before and after the three-week count period revealed a 9 per cent reduction in anxiety among participants, and a greater " +
  "sense of connection with nature, as well as noticing butterflies and nature more.\n\n" +
  "Further surveys completed by 345 people, which were sent five weeks after the count, did not find nature connectedness and " +
  "reduced anxiety had been maintained. But they revealed an increase in general wellbeing compared with before the project. " +
  "The research, published in the journal Biological Conservation, was carried out by Butterfly Conservation and the University " +
  "of Derby.\n\n" +
  "The surveys revealed people had a range of positive and negative emotions associated with taking part, ranging from joy and " +
  "fascination to sadness and concern about declining insects. Richard Fox, head of science at Butterfly Conservation, said, " +
  "\"This study is the first to prove that the simple act of looking for and counting butterflies leads to a decrease in anxiety. " +
  "The results suggest that citizen science projects can play a part in improving people's mental health, as well as gathering " +
  "important data on how butterflies are faring to inform our conservation work.\"\n\n" +
  "Carly Butler, lead researcher on the study, said the benefits of reduced anxiety and stronger connectedness with nature were " +
  "the same whether people just carried out one 15-minute count or did so multiple times. Dr Butler added that participants felt " +
  "motivated to help butterflies and nature by doing things such as making their gardens butterfly-friendly.";

const R = (q, o, passage, explanation) => ({ question: q, options: O(...o), passage, explanation });

Object.assign(patch, {
  "en2025-36": R("What did the author and his friend do in the bar?", [
    "They recalled their time in Thailand.", "They shared experiences in Colorado.",
    "They talked about the joy of graduation.", "They exchanged views on career success."], p1, "参考答案：A"),
  "en2025-37": R("What can be inferred about the author from Paragraph 3?", [
    "He has achieved success in writing.", "He has got a high score on the GRE.",
    "He does not enjoy his life in Portland.", "He regrets not having seen his friends."], p1,
    "根据文章第三段第一句可知，作者有点儿沮丧，接下来作者给出了沮丧的原因，即作者在与朋友见面后，因回忆起往日的快乐而感到失落，并对自己因忙碌而疏于联系朋友感到后悔与自责。由此可推断，作者后悔没有见他的朋友们。故选D。"),
  "en2025-38": R("What is a cause of humans' negative biological reaction to loneliness?", [
    "The requirement of family groups.", "The dependence on social support.",
    "The destruction of the environment.", "The improvement of living conditions."], p1,
    "根据文章第四段最后一句可知，进化心理学家认为，由于我们在原始时代依赖社会群体生存，因此如今孤独会引起消极的生理反应。由此可推断，人们对社会支持的依赖导致人类对孤独产生了消极的生理反应。故选B。"),
  "en2025-39": R("What does the author suggest in the passage?", [
    "Offering timely help to friends.", "Keeping in contact with friends.",
    "Relying on friends for social success.", "Caring for friends' career development."], p1,
    "文章最后一段提到，去联系一位许久未交谈的朋友吧，如果没什么特别的事，就去问候一下他们的近况吧。由此可知，作者建议读者与朋友们保持联系。故选B。"),
  "en2025-40": R("What troubles the Australian National Maritime Museum?", [
    "Shortage of staff.", "Pollution of water.", "Bird droppings.", "Long workdays."], p2,
    "文章第一段最后一句提到，海鸥的排泄物弄脏了船，导致博物馆工作人员花费大量时间清理海鸥留下的排泄物。由此可知，鸟类的排泄物让澳大利亚国家海事博物馆很困扰。故选C。"),
  "en2025-41": R("What is Bailey's job at the museum?", [
    "To catch thieves.", "To inspect visitors.", "To perform on the boats.", "To chase away seagulls."], p2,
    "文章第二段最后一句提到贝利被任命为“海鸥事务助理总监”，第三段第一句提到贝利早上的工作重点是把海鸥从船上赶走。由此可知，贝利在博物馆的工作是驱赶海鸥。故选D。"),
  "en2025-42": R("Which of the following is true about Bailey?", [
    "He receives regular body care.", "He is often disturbed by tourists.",
    "He enjoys working instead of playing.", "He becomes the symbol of the museum."], p2,
    "文章第四段第二句提到，贝利得到了很好的照顾，每两周就会由当地的动物医生为其梳毛。由此可知，贝利定期接受身体护理。故选A。"),
  "en2025-43": R("Which of the following is closest in meaning to the underlined expression \"clocked on\" in the last paragraph?", [
    "Off duty.", "In bed.", "Under control.", "At work."], p2,
    "文章最后一段第一句提到，当贝利______时，贝利不喜欢被打扰，以便专心工作。由此可推断，clock on 意为“打卡上班”，与下文的 when he is not working（当他不工作的时候）相呼应。off duty 意为“下班”；in bed 意为“在床上”；under control 意为“处于控制之下”；at work 意为“在工作”。故选D。"),
  "en2025-44": R("Which factor is mainly talked about in Paragraph 2?", [
    "Fuel.", "Wind.", "Slope.", "Flame."], p3,
    "文章第二段提到，风、燃料和地面坡度是三个关键因素，人们对第一个因素几乎无能为力。消防员会密切关注天气状况。理想情况下，风会将火焰吹回已经烧过的区域。由此可知，本段主要讨论的是“Wind(风)”。故选B。"),
  "en2025-45": R("Why should trees be bulldozed in firefighting?", [
    "To put out a controlled fire.", "To help the victims escape.",
    "To prevent fires from spreading.", "To make way for firefighters."], p3,
    "文章第三段提到，燃料（主要是树木）可通过推土机铲除或可控燃烧等方式处理，目的是使其不能助长火势。由此可知，在灭火时铲除树木是为了防止火势蔓延。故选C。"),
  "en2025-46": R("When can firefighters directly attack a fire?", [
    "When it is small and moving downhill.", "When it is big and moving sideways.",
    "When water bombers are available.", "When the trees ahead of it are wet."], p3,
    "根据文章第四段第五句可知，对于相对较小且向下坡蔓延的火势，可以采取直接灭火的方法，使用专门的工具将火焰扑灭。故选A。"),
  "en2025-47": R("Which of the following is closest in meaning to the underlined word \"dump\" in the last paragraph?", [
    "Drop.", "Boil.", "Absorb.", "Produce."], p3,
    "文章最后一段最后三句提到，灭火飞机可以______大量水。它们不仅仅是飞越火场上空洒水。通常它们会提前浇湿火势前方的燃料或火场两侧区域，以阻止火势蔓延。由此可推断，dump 意为“倾倒”。drop 意为“使落下”；boil 意为“煮沸”；absorb 意为“吸收”；produce 意为“生产、制造”。故选A。"),
  "en2025-48": R("What problem is Pittsburgh Arlington trying to solve?", [
    "Outdated school facilities.", "Little support for teachers.",
    "Frequent absence of students.", "Lack of money for programs."], p4,
    "根据文章第一段第一句可知，匹兹堡阿灵顿小学正在通过一种以社区为中心的方法来应对学生长期缺勤的问题。故选C。"),
  "en2025-49": R("What measure does the nanas program take to help students come to school?", [
    "Shortening school days.", "Giving financial rewards.",
    "Providing free bus rides.", "Offering choices of transportation."], p4,
    "根据文章第二段最后一句可知，“保姆计划”还提供往返学校的免费巴士接送服务，确保那些原本可能缺勤的学生能够正常出勤。故选C。"),
  "en2025-50": R("What does the underlined word \"This\" in Paragraph 4 refer to?", [
    "A quicker solution.", "A broader initiative.",
    "Collective responsibility.", "Community involvement."], p4,
    "文章第四段前两句提到，这些举措是一项更大规模的计划的一部分，旨在使学校成为一个对学生友好且有吸引力的地方。这包括与当地艺术组织合作设置有趣的课程，以及定期举办励志讲座来鼓励出勤。由此可推断，“This”指代的就是上文提到的“a broader initiative（更大规模的计划）”。故选B。"),
  "en2025-51": R("What would be the best title for this passage?", [
    "Nanas help find a new approach to teaching art",
    "Pittsburgh Arlington: the rebirth of an old school",
    "Students drop out of school: a big problem today",
    "Working together to get kids back into the classroom"], p4,
    "通读全文可知，文章围绕匹兹堡阿灵顿小学联合社区力量、采取多项措施（如“保姆计划”、免费校车等）解决学生缺勤问题，强调解决复杂社会问题需要学校、家庭及社区的共同参与和支持。D项（共同努力让孩子们重返课堂）最能概括文章的主旨大意，最适合作为文章的标题。故选D。"),
  "en2025-52": R("Why were people encouraged to participate in the Big Butterfly Count?", [
    "To understand anxiety.", "To connect with others.",
    "To find new butterfly species.", "To help with a science project."], p5,
    "文章第一段第二句提到，研究人员调查了2022年大型蝴蝶计数活动的参与者，在该活动中，野生动物慈善机构“蝴蝶保护组织”鼓励人们花15分钟在户外数蝴蝶，以帮助科学家追踪这些昆虫的生存状况。由此可知，人们被鼓励参与大型蝴蝶计数活动以助力一项科学研究项目。故选D。"),
  "en2025-53": R("What did further surveys find?", [
    "People had higher general wellbeing.", "People felt more excited about wildlife.",
    "People were closer to the natural world.", "People were more generous and helpful."], p5,
    "根据文章第二段第二句可知，后续调查显示，与项目开始前相比，人们的总体幸福感有所提高。故选A。"),
  "en2025-54": R("What were people concerned about according to the surveys?", [
    "Their inability to gather enough data.", "The decrease in butterfly populations.",
    "Their anxiety in doing the surveys.", "The duration of the counting task."], p5,
    "文章第三段第一句提到，调查显示，人们参与活动时产生了多种积极和消极情绪，从喜悦和着迷到对昆虫数量减少的悲伤和担忧。这里的“昆虫”指的就是蝴蝶。故选B。"),
  "en2025-55": R("What can people do to help butterflies and nature according to the last paragraph?", [
    "Expand their butterfly collections.", "Turn butterfly counting into a routine.",
    "Make their gardens fit for butterflies.", "Persuade their friends to help butterflies."], p5,
    "根据文章最后一段最后一句可知，参与者通过让花园变得适合蝴蝶生存等方式帮助蝴蝶和自然。故选C。"),
});

/* ---------------- V. Daily Conversation 56~60 ---------------- */
const dlgPassage =
  "Directions: Pick out five appropriate expressions from the eight choices below and complete the following dialogue " +
  "by blackening the corresponding letter on the Answer Sheet.\n\n" +
  "Nick: Hi, Ryan. Do you know when the test results will come out?\n" +
  "Ryan: ____(56)\n" +
  "Nick: I'm anxious to see how I did. ____(57)\n" +
  "Ryan: I'm not that nervous. ____(58)\n" +
  "Nick: I think most of the test was pretty easy, but some of the questions were tricky.\n" +
  "Ryan: ____(59) That won't do you any good.\n" +
  "Nick: How could you stay so calm all the time?\n" +
  "Ryan: ____(60)\n" +
  "Nick: You're lucky. I worry all the time.";

const dlgOpts = [
  "You'd better prepare for the test.", "Try not to worry about it too much.",
  "The professor didn't blame you.", "I have no idea.",
  "I don't think the test was hard.", "It's just who I am.",
  "I barely finished the test in time.", "I need to study harder.",
];
const dlgAns = { 56: "D", 57: "G", 58: "E", 59: "B", 60: "F" };
for (let n = 56; n <= 60; n++) {
  patch["en2025-" + n] = {
    question: "补全对话：第 " + n + " 空（从 A-H 中选出最佳选项）",
    options: dlgOpts.map((t, i) => ({ key: "ABCDEFGH"[i], text: t })),
    passage: dlgPassage,
    explanation: "参考答案：" + dlgAns[n],
  };
}

/* ---------------- VI. Writing 61 ---------------- */
patch["en2025-61"] = {
  question: "【写作】学生会打算举办一场旧书交换活动。请你给全校同学写一份通知，内容包括：" +
    " ·旧书交换的好处（如培养节约习惯、增强环保意识等）；" +
    " ·旧书交换活动的时间及地点；" +
    " ·可以交换的旧书类别（如课本、小说等）；" +
    " ·号召大家积极参与。",
};

/* ---------------- 写出 ---------------- */
const out = path.join(__dirname, "patch_en2025.json");
fs.writeFileSync(out, JSON.stringify(patch, null, 1), "utf-8");
console.log("已写出", out);
console.log("覆盖题数:", Object.keys(patch).length);
console.log("id 列表:", Object.keys(patch).join(","));
