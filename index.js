const cheerio = require('cheerio')
const fetch = require('node-fetch')

const { createWriteStream, existsSync, mkdirSync } = require('fs')
const {pipeline} = require('stream')
const {promisify} = require('util')

const TEANGLANN = 'https://www.teanglann.ie'
const alphabet = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z']
const dialects = ["C", "U", "M"]

async function downloadPath(path, retryCount) {

  const fullPath = './words' + path
  if (existsSync(fullPath)) {
    return Promise.resolve()
  }
  const streamPipeline = promisify(pipeline);

  try {
    const response = await fetch(TEANGLANN + path);
    if (!response.ok) {
      throw new Error(`unexpected response ${response.statusText}`)
    }
    return streamPipeline(response.body, createWriteStream(fullPath));
  } catch (e) {
    if (retryCount < 2 && e.message.includes("getaddrinfo ENOTFOUND")) {
      console.log("RETRYING " + path + " count " + retryCount + " " + e.message)
      return downloadPath(path, retryCount+1)
    } else {
      throw e
    }
  }

}


async function downloadForLetter(letter) {

  const response = await fetch(`https://www.teanglann.ie/ga/fuaim/_${letter}`)
  const body = await response.text()

  const $ = cheerio.load(body)

  const words = $(".abcChapter .abcItem a").map((i, e) => $(e).text()).get()

  console.log(`Downloading for ${letter} ${words.length} words`)

  const interval = Math.floor(words.length * 0.1)

  for (const wordIndex in words) {
    if (wordIndex % interval === 0) {
      console.log(`\n> ${(wordIndex / interval)*10}%`)
    }
    process.stdout.write(" " + words[wordIndex]);

    await Promise.all(
      dialects.map(c => downloadPath(`/Can${c}/${words[wordIndex]}.mp3`, 0))
    )
  }


}


async function main() {
  if (!existsSync("./words")){
    mkdirSync("./words")
  }

  for (const d of dialects) {
    const dir = "./words/Can" + d
    if (!existsSync(dir)){
      mkdirSync(dir)
    }
  }

  for (const letter of alphabet) {
    await downloadForLetter(letter)
  }
}

main()

