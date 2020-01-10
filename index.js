import credentials from './config.json'
import Bottleneck from 'bottleneck'
import axios from 'axios'

import { Grid } from "ag-grid/main";

// import bootstrap from "bootstrap";
import 'bootstrap/dist/css/bootstrap.css'

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

const minTime = 250
const limiter = new Bottleneck({
    minTime: minTime
})

const limAxios = limiter.wrap(axios)

const arrayConcatByField = (field) => function (params) {
    return params.data[params.colDef.field]
        .map(a => a[field])
        .join(', ')
}
const getCustomFieldValue = (custom_field_id) => function (params) {
    const field = params.data.fields.filter(f => f.custom_field_id == custom_field_id)
    return field.length > 0 ? field[0].value : ''
}
const addEuro = (params) => params.value != '' ? params.value + ' €' : ''

const updateApi = function (params) {
    console.log(params)
    return true
}

const pillsRenderer = function (params) {
    return params.value.split(',').map(v => `<span class="badge badge-pill badge-info ml-1 my-1" style="font-size:100%">${v}</span>`).join('')
}
const InitialPriceColumn = function (field) {
    return {
        headerName: field.label,
        editable: true,
        valueGetter: getCustomFieldValue(field.custom_field_id),
        valueFormatter: addEuro,
        type: "numericColumn",
        maxWidth: 100
//        filter: 'agNumberColumnFilter'
    }
}
const createCustomFieldColumn = function (field) {
    switch (field.label) {
        case 'Initial Price': 
            return InitialPriceColumn(field)
        default:
            return {
                headerName: field.label,
                editable: true,
                valueGetter: getCustomFieldValue(field.custom_field_id)
            }
    }
}

const defaultColDef = {
    //cellClass: 'text-right'
    // filter: true,
    // sortable: true
}

const columns = [
    { headerName: 'Name', field: 'name', cellStyle: { 'white-space': 'normal' }, cellClass: 'text-right' },
    {
        headerName: 'Category',
        field: 'categories',
        cellRenderer: pillsRenderer,
        autoHeight: true,
        valueGetter: arrayConcatByField('name'),
        order: 100        
    },
    {
        headerName: 'Price',
        field: 'price',
//        filter: 'agNumberColumnFilter',
        type: "numericColumn",
        valueFormatter: addEuro,
        editable: true,
        valueSetter: updateApi,
        maxWidth: 100
    }
]

const eGridDiv = document.querySelector('#myGrid');

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
                    .map(a => a.product)
            )
        })
        .catch(e => {
            document.querySelector('#alert').classList.remove('d-none');
            document.querySelector('#alert').innerHTML = "Failed to fetch products"
            console.log(`Failed to fetch products. Consider increasing time between requests\nCurrent interval: ${minTime} ms\n`, e)
            return []
        })
}

const gridOptions = {
    enableFilter: true,
    enableSorting: true,
    // autoSizeColumns:true,
    defaultColDef: defaultColDef,
    columnDefs: columns,
    onGridReady: params => params.api.sizeColumnsToFit()
}

const getCustomFields = function (products) {
    var s = {}
    products.forEach(p => p.fields.forEach(f => s[f.custom_field_id] = f))

    return Object.values(s)
}

getAllProducts(url, auth)
    .then(products => {
        gridOptions.rowData = products
        const customFields = getCustomFields(products)
        customFields.forEach(f => gridOptions.columnDefs.push(createCustomFieldColumn(f)))
        gridOptions.columnDefs.sort((a, b) => (a.order || 1) > (b.order || 1))
        return new Grid(eGridDiv, gridOptions)
    })
        