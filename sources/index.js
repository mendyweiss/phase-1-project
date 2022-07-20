import {API_KEY} from "../config.js";
//Global Variables
const canvas = document.getElementById('chart').getContext("2d")
const profitsCanvas = document.getElementById('chart2').getContext("2d")

//Fetch function accepts a stock name and what to do (a parseing function) with the data
function fetchFunc (stock, func) {
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': API_KEY,
            'X-RapidAPI-Host': 'yh-finance.p.rapidapi.com'
        }
    };
    
    fetch(`https://yh-finance.p.rapidapi.com/stock/v3/get-historical-data?symbol=${stock}&region=US`, options)
        .then(response => response.json())
        .then(response => func(response))
        .catch(err => console.error(err));
}

 
 // a function to build the charts
 function createCharts (labels, data, tooltips, canvasName, chartTitle){
        // a function to color the bars on the chart
    function barColor (data) {
       return data.map((element) => {
            if (element > 0) {
                return 'rgb(127, 255, 0, 1)'
            } else {
                return 'rgba(255, 0, 0, 1)'
            }
        });
    }
    function addToolTips (data) {
        return data.map(element => element)
    }

    let chartDatas = {
        labels: labels,
        datasets:[{
            label: chartTitle,
            data: data,  
            backgroundColor: barColor(data)                           
        }],
 
    }
    let configs = {
     type:'bar',
     data: chartDatas,
     options: {
         plugins:{
             tooltip: {
                yAlign: 'bottom',
                displayColors: false,
                callbacks: {
                    title: function (tooltips, index) {
                        return tooltips[index]
                    }
                },
                label: tooltips
             },
         },
         responsive: 'true',
         scales: {
             y: {
                 beginAtZero: true
                 }
             }
         }
     }
     new Chart(canvasName, configs)
}


function dataParser (response){

    let abbreviatedDays = [] // labels for charts
    let tooltipsDays = [] //tooltips for charts
    let gap = [] // gap for calculations
    let dayShifted = [] //for calculations (How much it shifted that day)
    let total = 0; // for calculations and printed data (3rd chart)
    let profitableDays = 0; // for printed data
    let lossesDays = 0; // for printed data
    let gapupDays = 0;  // for printed data
    let gapdownDays = 0; // for printed data

    // looping through the response
    for (let i = 0; i < response.prices.length - 1; i++){

        //setting the data
        let yesterdaysClose = response.prices[(i + 1)].close
            yesterdaysClose = Math.floor(yesterdaysClose * 100) / 100 //rounding to the cent mark
        let open = response.prices[i].open
            open = Math.floor(open * 100) / 100
        let gapAmount = Math.floor((open - yesterdaysClose) * 100) / 100
        // I was running into issues with dividend days 
        if (gapAmount){ 
            gap.push(gapAmount)
            let close = response.prices[i].close
            close = Math.floor(close * 100) / 100
            let change = Math.floor((close - open) * 100) / 100

            // setting the labels and tooltips
            let time = response.prices[i].date
            let day = new Date(time * 1000)
            abbreviatedDays.push(day.getDate())
            tooltipsDays.push(day)
            
            
            //if partial gap up then buy long if partial gap down short the market
            if (yesterdaysClose >= open) { // i.e. partial gap down
                gapdownDays += 1;
                if (close < open) { // i.e. buying a put or shorting the market in the morning and selling/rebuying At the end of the day
                    dayShifted.push(change)
                    total += Math.abs(change)
                    profitableDays += 1
                } else {
                    dayShifted.push(change)
                    total -= change
                    lossesDays += 1
                }
            } else { // partial gap up
                gapupDays += 1;
                if (close > open) { // buying the stock or options in the morning and selling it at the end of the day
                    dayShifted.push(change)
                    total += change
                    profitableDays += 1
                } else {
                    dayShifted.push(change)
                    total -= change
                    lossesDays += 1
                }
            }
        }
    };
    createCharts(abbreviatedDays, gap, tooltipsDays, canvas, 'Gap Open');
    createCharts(abbreviatedDays, dayShifted, tooltipsDays, profitsCanvas, 'Daily Profits');
    document.getElementById('gapupDays').textContent = `~ ${gapupDays}` 
    document.getElementById('gapupDays-percent').textContent = `%${Math.round((gapupDays / gap.length) * 100)}` 
    document.getElementById('gapdownDays').textContent = `~ ${gapdownDays}` 
    document.getElementById('gapdownDays-percent').textContent = `%${Math.round((gapdownDays / gap.length) * 100)}` 
    document.getElementById('profitableDays').textContent = `~ ${profitableDays}`;
    document.getElementById('profitableDays-percent').textContent = `%${Math.round((profitableDays / gap.length) * 100)}`;
    document.getElementById('lossesDays').textContent = `~ ${lossesDays}`;
    document.getElementById('lossesDays-percent').textContent = `%${Math.round((lossesDays / gap.length) * 100)}`;
    document.getElementById('total').textContent = `~ $${Math.floor((total * 100) / 100)}`;
    // making sure the first or last element from the api is not a dividend day 
    const marketFirstDay = response.prices.length
    let marketPriceBeginningYear = response.prices[marketFirstDay - 1].open
    if (!marketPriceBeginningYear){
        marketPriceBeginningYear = response.prices[marketFirstDay - 2].open
    }
    let marketPriceEndYear = response.prices[0].close
    if (!marketPriceEndYear){
        marketPriceEndYear = response.prices[1].close
    }
    document.getElementById('total-percent').textContent = `~ %${(total / marketPriceBeginningYear)}`;
    console.log(total)
    console.log(marketPriceBeginningYear)
    console.log((total / marketPriceBeginningYear) * 100)
    document.getElementById('market').textContent = `~ $${Math.floor((marketPriceEndYear - marketPriceBeginningYear) * 100) / 100}`
    document.getElementById('market-percent').textContent = `~ %${Math.round(((marketPriceEndYear - marketPriceBeginningYear) ) * 100)}`

}


//inital charts

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('history').hidden = true
    document.getElementById('data-text').hidden = true
     fetchFunc('SPY', dataParser)
})



// form function
document.getElementById("submitStockType").addEventListener('click', (event) => {
    event.preventDefault();
    
    const searchForStock = document.getElementById('choices').value

    const historyTag = document.createElement('li')
    historyTag.textContent = searchForStock
    document.getElementById('list').append(historyTag)
    document.getElementById('data-text').hidden = false
    fetchFunc(searchForStock, dataParser)


})

// manu botton
document.getElementById('manu').addEventListener('click', () => {
    document.getElementById('history').hidden = false
})
// close button
document.getElementById('closeBtn').addEventListener('click', () => {
    document.getElementById('history').hidden = true
})
// clear history botton
document.getElementById('eraser').addEventListener('click', () => {
    document.getElementById('list').innerHTML = ''
})