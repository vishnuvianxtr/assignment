const express = require('express');
const axios = require('axios')
var app = express();
const async = require('async')
const util = require('util')
const fetch = require("node-fetch");

async function fetchData(responses) {
    console.log("Fetching the File...");

    // 1.Fetch document from given url http://norvig.com/big.txt
    fetch('http://norvig.com/big.txt')
        .then(response => response.text())
        .then((response) => {

            console.log("Analysing data...");
            var words = response.replace(/(\r\n|\n|\r)/gm,' ');
            words = words.replace(/[^a-zA-Z ]/g, ' ');
            words = words.replace(/"|,|!|;|:|#|_/g,' ');
            words = words.replace(/\s+/g,' ');
            words = words.toLowerCase();
            words = words.split(' ');  
            
            console.log(words.length+" Words Detected");

            // 2.a. Find occurances count of word in document
            var analysedWords = [], occurrence = [], prev;
            words.sort();
            for (var i = 0; i < words.length; i++) {
              if (words[i] !== prev) {
                analysedWords.push(words[i]);
                occurrence.push(1);
              } else {
                occurrence[occurrence.length - 1]++;
              }
              prev = words[i];
            }

            console.log("Getting Top 10 Occurring Words...");
            // 2.b. Collect details for top 10 words(order by word Occurrences)
            var top10=[];
            var copyOfOccurrence = [...occurrence];
            for(i=0;i<10;i++){
            var highestOccurrence = copyOfOccurrence.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
            top10.push({Word : analysedWords[highestOccurrence], Output :[{Occurrence : occurrence[highestOccurrence]}]})
            copyOfOccurrence[highestOccurrence]=0;
            }
            

            var meanings = [];
            // Skeleton function for Asyc Queue
            getMeanings=(word,callback)=>{
              axios
              .post('https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=dict.1.1.20210216T114936Z.e4989dccd61b9626.373cddfbfb8a3b2ff30a03392b4e0b076f14cff9&lang=en-ru&text='+word)
              .then(res => {
                var tempArr=[];
                var means;
                try{
                  means=res.data.def[0].tr[0].mean;
                  means.forEach((arg)=>{
                    tempArr.push(arg.text)
                  })
                  // 2.b.i synonyms/means
                  // 2.b.ii part Of Speech/pos
                  try{ meanings.push({word:word,meaning:tempArr,pos:res.data.def[0].pos}) }
                  catch {  meanings.push({word:word,meaning:tempArr,pos:['No POS Found']}) }
                  callback();
                } catch{
                  try{
                    meanings.push({word:word,meaning:['No Synonyms Found'],pos:res.data.def[0].pos})
                  }catch{
                    meanings.push({word:word,meaning:['No Synonyms Found'],pos:['No POS Found']})
                  }
                  callback();
                }
                
              })
              .catch(error => {
                console.error(error)
              })
            }

            var processQueue = async.queue(getMeanings, 1);

            callBEnd = (arg)=>{
              top10.forEach((arg,index)=>{
                top10[index].Output.push({Synonyms:meanings[index].meaning});
                top10[index].Output.push({Pos:meanings[index].pos})
              })
              console.log("\nProcess Finished\n")
              // 3. Show words list in JSON format for top 10 words.
              console.log(util.inspect(top10, {showHidden: false, depth: null,colors: true}))
            }

            processQueue.drain(callBEnd);
          
            // Getting Synonyms and POS using async queue
            process.stdout.write("Getting Synonyms & Pos from Yandex");
            top10.forEach((arg)=>{
              processQueue.push(arg.Word,()=>{process.stdout.write('.')});
            })           
         })
        .catch(err => console.log(err));

}


fetchData();

