const reddit = require("./reddit");
const data = require('./data.json');

(async () => {
  await reddit.intitalize();

  await reddit.login(data.username, data.password);

  await reddit.getResults(data.subreddit ,data.post);

  await reddit.findMatches();

  //only to test messages if messages arent sending
//   await reddit.testsendMessage()
})();
