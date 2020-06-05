const puppeteer = require("puppeteer");
const data = require('./data.json');
const colors = require('colors');

const SUBREDDIT_URL = (reddit) => `https://old.reddit.com/r/${reddit}/`;
const REDDIT_URL = `https://old.reddit.com/`;
const SEND_MESSAGE_URL = (user) => `https://old.reddit.com/message/compose/?to=${user}`;

const self = {
  browser: null,
  page: null,
  results: [],

  intitalize: async () => {
    self.browser = await puppeteer.launch({ headless: true });
    self.page = await self.browser.newPage();
  },

  login: async (username, pass) => {
    await self.page.goto(REDDIT_URL, { waitUntil: "networkidle0" });

    // enter username and password
    await self.page.type('input[name="user"]', username, { delay: 30 });
    await self.page.type('input[name="passwd"]', pass, { delay: 30 });

    //click login
    await self.page.click("#login_login-main > div.submit > button");

    //check for errors
    await self.page.waitFor(
      `form[action="https://old.reddit.com/logout"],div[class="status error"]`
    );
    let error = await self.page.$('div[class="status error"]');

    if (error) {
      let errorMsg = await (await error.getProperty("innerText")).jsonValue();

      console.log(`${username} failed to login`.red);
      console.log(`Error: ${errorMsg}`);
      process.exit(1);
    } else {
      console.log(`${username} is logged in!`.green);
    }
  },

  getResults: async (reddit, nr) => {
    let newResults = await self.parseResults(reddit);

    self.results = [...self.results, ...newResults];

    do {
      if (self.results.length < nr) {
        let nextpageBtn = await self.page.$(
          `span[class="next-button"] > a[rel="nofollow next"]`
        );

        if (nextpageBtn) {
          await nextpageBtn.click();
          await self.page.waitForNavigation({ waitUntil: "networkidle0" });
        } else {
          break;
        }
      }
    } while (self.results.length < nr);

    return self.results.slice(0, nr);
  },

  parseResults: async (reddit) => {
    // // Go to subreddit
    await self.page.goto(SUBREDDIT_URL(reddit), { waitUntil: "networkidle0" });

    let elements = await self.page.$$(`#siteTable > div[class*="thing"]`);
    let results = [];

    for (let ele of elements) {
      let title = await ele.$eval((`p[class="title"]`), (node) =>
        node.innerText.trim()
      );
   
      let rank = await ele.$eval(`span[class="rank"]`, (node) =>
        node.innerText.trim()
      );
      let time = await ele.$eval(`p[class="tagline "] > time`, (node) =>
        node.getAttribute("title")
      );
      let authorURL = await ele.$eval(
        `p[class="tagline "] > a[class*="author"]`,
        (node) => node.getAttribute("href")
      );
      let authorName = await ele.$eval(
        `[class="tagline "] > a[class*="author"]`,
        (node) => node.innerText.trim()
      );
      let score = await ele.$eval(`div[class="score likes"]`, (node) =>
        node.innerText.trim()
      );
      let comments = await ele.$eval(
        `a[data-event-action="comments"]`,
        (node) => node.innerText.trim()
      );

      results.push({
        title,
        rank,
        time,
        authorName,
        authorURL,
        score,
        comments,
      });
    
    }
    return results;
  },

  findMatches: async () => {
      console.log('finding possible matches!'.rainbow)
      for (let post of self.results) {
          if (post.title.toLowerCase().includes(data.keyword)) {
              await self.sendMessage(post)
          }
      }

      console.log('All possible messages sent!, goodbye!'.trap);
      process.exit(1);
  },

  sendMessage: async (post) => {
    // go to users profile
    if (post.authorName === 'AutoModerator') {
      console.log('Dont send to mods buddy!'.cyan)
      return;
    }
    console.log(`sending message to ${post.authorName}`.cyan)
    await self.page.goto(SEND_MESSAGE_URL(post.authorName), { waitUntil: "networkidle0" });

    await self.page.waitFor(2500)

    await self.page.type(`#compose-message > div:nth-child(3) > div > div > input[type=text]`, data.subject, { delay: 30 })
    await self.page.type(`#compose-message > div.spacer.message_field > div > div > div.usertext > div > div.md > textarea`, data.message, { delay: 30 })

    //send message
    await self.page.click('#send');
    console.log(`Message sent to user: ${post.authorName}`.yellow)

  },


  testsendMessage: async () => {
    // go to users profile
 
    await self.page.goto('https://old.reddit.com/message/compose/?to=Synthcarbon ', { waitUntil: "networkidle0" });

    await self.page.waitFor(2500)

    await self.page.type(`#compose-message > div:nth-child(3) > div > div > input[type=text]`, data.subject, { delay: 30 })
    await self.page.type(`#compose-message > div.spacer.message_field > div > div > div.usertext > div > div.md > textarea`, data.message, { delay: 30 })

    //send message
    await self.page.click('#send');
    console.log(`Message sent.`)

  }
  
};

module.exports = self;
