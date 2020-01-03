import credentials from './config.json'
import Bottleneck from 'bottleneck'
import axios from 'axios'

import {Grid} from "ag-grid/main";

import "ag-grid/dist/styles/ag-grid.css";
import "ag-grid/dist/styles/ag-theme-balham.css";

const range = function range(start, end) {
    const ans = [];
    for (let i = start; i <= end; i++) {
        ans.push(i);
    }
    return ans;
}


const auth = `login=${credentials.login}&authtoken=${credentials.token}`
const url = credentials.url

const limiter = new Bottleneck({
    minTime: 250
})

const limAxios = limiter.wrap(axios)

const columns = [
		{headerName: 'Name', field: 'name', filter: true},
		{headerName: 'Category', field: 'category', filter: true},
		{headerName: 'Price', field: 'price', filter: true}
	]

let eGridDiv = document.querySelector('#myGrid');

const getAllProducts = function (url, auth) {
    const maxPage = 50
    return limAxios(url + 'products/count.json?' + auth)
    .then(response => {
        const pages = range(1, 1 + response.data.count / 50)
        const productP = pages.map(p => 
            limAxios(`${url}products.json?page=${p}&${auth}`)
            .then(resp => resp.data)
        )
        return Promise.all(productP).then(pageArray => 
            pageArray.flat()
            .map(a => a.product))
    })
}

getAllProducts(url, auth)
.then(products => {
    return new Grid(eGridDiv, {columnDefs: columns, rowData: products});
})
