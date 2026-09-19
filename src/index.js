import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const USER_AGENT = 'FlyRankInternshipA9/1.0 (+https://github.com/linamarg/flyrank-05)';
const CACHE_DIR = 'cache';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPage(url, cacheFilePath) {
  if (fs.existsSync(cacheFilePath)) {
    const html = fs.readFileSync(cacheFilePath, 'utf-8');
    console.log('CACHE HIT', cacheFilePath, html.length);
    return html;
  } else {
    const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(5000)
    });
    if (response.status !== 200) {
        throw new Error(`Fetch failed: ${response.status} for ${url}`);
    }
    const html = await response.text();
    fs.writeFileSync(cacheFilePath, html);
    console.log('FETCH', cacheFilePath, html.length);
    await delay(500); // pauses for 500ms
    return html;
  }
}

function extractBookLinks(html, pageUrl) {
  const $ = cheerio.load(html);
  const links = [];

  $('.product_pod h3 a').each((i, el) => {
    const href = $(el).attr('href');
    const absoluteUrl = new URL(href, pageUrl).href;
    links.push({ url: absoluteUrl, sourcePage: pageUrl });
  });

  return links;
}

function extractNextPage(html, pageUrl) {
  const $ = cheerio.load(html);
  const href = $('li.next a').attr('href');

  if (!href) {
    return null;
  }

  return new URL(href, pageUrl).href;
}

function extractBookDetails(html, bookUrl, sourcePage) {
  const $ = cheerio.load(html);

  const title = $('h1').text();
  const priceText = $('.price_color').text();
  const availabilityText = $('.instock.availability').text().trim();
  const ratingClass = $('.star-rating').attr('class');
  const ratingText = ratingClass.split(' ')[1];
  const descriptionEl = $('#product_description').next('p');
  let description;
  if(descriptionEl.length === 0){ 
    description = null;
  } else {
    description = descriptionEl.text().trim();
  }
  

  return {
    title,
    product_url: bookUrl,
    price_text: priceText,
    availability_text: availabilityText,
    rating_text: ratingText,
    description,
    source_page: sourcePage,
    fetched_at: new Date().toISOString()
  };
}

let currentUrl = 'https://books.toscrape.com/catalogue/page-1.html';
let allBookLinks = [];

for (let pageNum = 1; pageNum <= 3; pageNum++){
  const cacheFilePath = `cache/catalogue-page-${pageNum}.html`;
  const html = await fetchPage(currentUrl, cacheFilePath);
  allBookLinks = allBookLinks.concat(extractBookLinks(html, currentUrl));
  currentUrl = extractNextPage(html, currentUrl);
}

const seenUrls = new Set();
const uniqueBooks = allBookLinks.filter(book => {
  if (seenUrls.has(book.url)) {
    return false; // already seen, drop it
  }
  seenUrls.add(book.url);
  return true; // first time seeing it, keep it
});

console.log(`catalogue_pages=3`);
console.log(`discovered=${allBookLinks.length}`);
console.log(`unique_urls=${uniqueBooks.length}`);

let allBookRecords = [];

for (const book of uniqueBooks) {
  const cachePath = `cache/book-${book.url.split('/').at(-2)}.html`;
  const html = await fetchPage(book.url, cachePath);
  const record = extractBookDetails(html, book.url, book.sourcePage);
  allBookRecords.push(record);
}

console.log('detail_pages=' + allBookRecords.length);
console.log(allBookRecords[0]);

const fixtureHtml = fs.readFileSync('fixtures/no-description.html', 'utf-8');
const fixtureRecord = extractBookDetails(fixtureHtml, 'https://fake-url/test', 'https://fake-source/test');
console.log('fixture test — description should be null:', fixtureRecord.description);
