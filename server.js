import playwright from "playwright";
import express from "express";
import { engine as handlebars } from "express-handlebars";
import bodyParser from 'body-parser';
import multer from 'multer';
import { promises as fs } from "fs";
import path from 'path';
import { fileURLToPath } from 'url';
import { customAlphabet } from "nanoid";
const nanoid = customAlphabet('1234567890abcdef', 10);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import AIProcessor from "./aiProcessor.js";


// EXPRESS.JS SETUP                                            <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
const app = express()

app.set('view engine', 'handlebars');
app.engine('handlebars', handlebars({
    layoutsDir: __dirname + '/views/layouts',
}));
app.use(express.static('public'))

var upload = multer();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(upload.array());

// EXPRESS.JS ENDPOINTS                                        <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

// GETs         >>>>>

app.get("/", (req, res) => {
    res.render('index', { layout: 'index' });
})

app.get("/explore", (req, res) => {
    res.render('explore', { layout: 'index' });
})

app.get("/ai", (req, res) => {
    res.render('ai/index', { layout: 'index' });
})


//  POSTs        >>>>>

app.post("/api/ai", async (req, res) => {
    const {name, description, context, jsonURL} = req.body
    const instagramJSONString = await fs.readFile("./public"+(new URL(jsonURL)).pathname, "utf-8")
    const instagramJSON = await JSON.parse(instagramJSONString)
    const { keyword, exploredPosts } = instagramJSON

    const aiResponse = await AIProcessor.pickSuitingPosts(name, description, context, keyword, exploredPosts)

    res.render('ai/response', { layout: 'index', aiResponse, keyword, instagramPosts: exploredPosts })
})

app.post("/api/explore", async (req, res) => {
    console.log(req.body)
    const { word, user, pass, limit } = req.body;

    if (!word || !user || !pass) {
        res.redirect("/?alert=Please provide a Word and Instagram Username and Password")
        return
    }

    const instagramJSON = await getInstagramPostComments(word, user, pass, parseInt(limit ? limit : 5))

    console.log("Writing Explored Posts-Comments to File...")
    console.log(instagramJSON)

    const jsonFile = `${nanoid()}.json`
    await fs.writeFile(

        `./public/${jsonFile}`,

        JSON.stringify(instagramJSON)
    );
    res.redirect("/"+jsonFile)
})




app.listen(3000, () => {
    console.log("Express Listening on 3000")
})





// PLAYWRIGHT Instagram Posts-Comments Scraper                  <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<


// Initialize Playwright & Login to Instagram

const getInstagramPostComments = async (word, username, password, limit = 0) => {
    const browserType = "firefox"
    console.log(browserType); // To know the chosen one 😁
    const browser = await playwright[browserType].launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("https://www.instagram.com/accounts/login/");
    // Login form
    // set a delay to wait for page to completely load all contents
    await page.waitForTimeout(2000);
    // You can also take screenshots of pages
    console.log("Logging In")
    await page.click('button:is(:text("Allow all cookies"))');
    await page.type("[name=username]", username);
    await page.type('[type="password"]', password);
    await page.click("[type=submit]");
    await page.waitForTimeout(5000);

    console.log("Searching for hotdogs")
    await page.goto(`https://www.instagram.com/explore/tags/${word}`);
    await page.waitForTimeout(5000);
    const exploredPosts = await iterateExplorePosts(page, limit)

    await browser.close();
    const instagramJSON = {
        keyword: word,
        exploredPosts
    }
    console.log(instagramJSON)
    return instagramJSON
}


// Extracts Posts-Comments from Instagram Explore Page

async function iterateExplorePosts(page, limit) {

    console.log("Going through Posts...")
    const postsContainer = await page.locator("article")
    console.log(await postsContainer.count())
    const posts = await postsContainer.first().locator("a")
    console.log(await posts.count())
    const postsCount = await posts.count()

    if (postsCount == 0) {
        await page.reload()
        page.waitForTimeout(8000)
        return await iterateExplorePosts(page.limit)
    }

    var exploredPosts = []

    // open First Post
    const post = await posts.nth(0)
    console.log(post)
    await post.click()


    // iterate Posts List
    var i = 0
    while (limit == 0 || i < limit) {
        console.log("Getting Post's Comments..")
        // iterate Posts
        await page.waitForTimeout(5000)
        const postArticle = await page.locator("article").nth(1)
        const likeText = await postArticle.locator("section").nth(1).innerText()
        console.log(likeText)
        const likeCount = parseInt(likeText.replace(/\D/g, ''))
        console.log(likeCount)

        var commentTexts = []
        const comments = await postArticle.locator("ul")
        const commentsCount = await comments.count()
        console.log("commCount", commentsCount)


        //  Grab Comments from this Post
        for (var cI = 0; cI < commentsCount; cI++) {
            const comment = await comments.nth(cI)
            const commentText = await comment.innerText()
            console.log("commentText", cI)
            commentTexts.push(commentText)
        }


        console.log("commentTexts for Post ", i, commentTexts)

        const postURL = await page.url()
        console.log("postURL", postURL)
        exploredPosts.push({
            postURL,
            postComments: commentTexts
        })
        console.log(exploredPosts)
        //  Go to Next Post or End
        const nextAvailable = await page.locator('button:has-text("Next")').count() > 0
        if (!nextAvailable) {
            break;
        }

        await page.click('button:has-text("Next")');
        i++;
    }
    return exploredPosts
}