import axios from 'axios';
import React, { useState, useEffect } from 'react'
import { saveAs } from "file-saver";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import GmSheetCalculation from './GmSheetCalculation';

const date = new Date();
const options = { month: 'short' };
const month = date.toLocaleDateString('en-US', options);
const year = String(date.getFullYear()).slice(-2);

const currentMonthYear = `${month} ${year}`;

const OpenGM = ({ refreshlst, projectId, accountId, sowId, accountdata }) => {

    const [listdata, setlistdata] = useState([])
    const [listloadrunsheet, setloadrunsheet] = useState([])
    const [runSheetTableHeaders, setRunSheetTableHeaders] = useState([])
    const [runSheetTableMonthHeaders, setRunSheetTableMonthHeaders] = useState([])
    const [showRunSheet, setShowRunSheet] = useState(false);

    const [runSheetPayload, setRunSheetPayload] = useState([]);
    const [isRunSheetSave, setIsRunSheetSave] = useState(false);
    const [isGmSheetSave, setIsGmSheetSave] = useState(false);
    const [refresh, setRefresh] = useState(true);
    const [refreshGmSheetCalc, setRefreshGmSheetCalc] = useState(true);

    const [initialData, setInitialData] = useState({
        slno: 0,
        brspdMgr: "",
        program: "",
        status: "Active",
        name: "",
        roleaspersow: "",
        duration: "",
        startdate: null,
        enddate: null,
        location: "Offshore",
        type: "salaried",
        hours: "",
        billrate: "",
        payrate: "",
        loadedrate: "",
        billable: "Yes",
        accountId: 0,
        projectId: 0,
        sow: 0,
        test: "",
        source: "RunSheet",
        totalcost: 0,
        totalrevenueytd: 0,
        totalrevenueytdproject: 0,
        totalrevenue: 0,
    })

    const [rows, setRows] = useState([])

    const [lstrunsheetsummary, setlstrunsheetsummary] = useState({
        "actualrevenueprojection": 0,
        "afterdiscount": 0,
        "plannedgmpercentage": 0,
        "plannedgm": 0,
        "plannedcostnottoextend": 0,
        "actualcostprojection": 0,
        "costoverrun": 0,
        "projectgmpercentage": 0,
        "balanceamountprojected": 0
    })

    const [lstrunsheetsummaryYTD, setlstrunsheetsummaryYTD] = useState({
        "actualrevenueprojection": 0,
        "afterdiscount": 0,
        "plannedgmpercentage": 0,
        "plannedgm": 0,
        "plannedcostnottoextend": 0,
        "actualcostprojection": 0,
        "costoverrun": 0,
        "projectgmpercentage": 0,
        "balanceamountprojected": 0
    })

    const getdata = () => {
        axios.get(`http://localhost:5071/api/GM/${accountId}/${projectId}/1`).then(res => {
            setlistdata(res.data)
        })
    }

    const handleloadrunsheet = () => {
        setShowRunSheet(true);
        axios.get(`http://localhost:5071/api/GM/Runsheet/${accountId}/${projectId}`).then(res => {
            setloadrunsheet(res.data?.gmRunSheet || [])
            setRunSheetTableHeaders(res.data?.columnHeader || []);
            setRunSheetTableMonthHeaders(res.data?.monthHeaders || []);
        })
    }

    const handleDelete = (Id) => {
        axios.delete(`http://localhost:5071/api/GM/${Id}`).then(res => {
            getdata()
        })
    }

    const getRunsheetSummary = () => {
        axios.get(`http://localhost:5071/api/GM/Runsheetsummary/${accountId}/${projectId}`).then(res => {
            setlstrunsheetsummary(res.data?.SummaryActual)
            setlstrunsheetsummaryYTD(res.data?.SummaryYTD)
        })
    }

    useEffect(() => {
        if (accountId > 0 && projectId > 0) {
            getdata()
            setRefreshGmSheetCalc(a => !a);
            setInitialData({ ...initialData, accountId, projectId, sow: sowId })
        }
    }, [refreshlst, projectId, accountId])

    const convertDate = (date) => {
        if (!date) return "";
        return date.split("T")[0]
    }

    useEffect(() => {
        let payload = [];
        if (listloadrunsheet.length > 0) {
            listloadrunsheet.map((lst) => {
                lst.runsheet.map(r => {
                    if (r?.currentMonth) {
                        payload.push({ GmId: lst.gmId, month: r?.month, hours: r?.hours })
                    }
                })
            });
            setRunSheetPayload(payload);
            getRunsheetSummary();
        }
    }, [listloadrunsheet])


    const downloadExcel = async () => {
        try {
            const response = await fetch(`http://localhost:5071/api/GM/Excel/${accountId}/${projectId}`, {
                method: "Get",
                headers: {
                    Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                }
            });

            if (!response.ok) throw new Error("Failed to download file");

            const blob = await response.blob();
            const fileName = "exported_data.xlsx";
            saveAs(blob, fileName);
        } catch (error) {
            console.error("Error downloading the Excel file:", error);
        }
    };

    const handleSaveRunSheetChange = (evt, id, month) => {
        setIsRunSheetSave(true);
        let updatedPayload = runSheetPayload.map((row) => (
            id == row.GmId && row.month == month ? {
                ...row, hours: evt.target.value
            } : row
        ))
        setRunSheetPayload(updatedPayload)
    }

    const handleSaveRunSheet = () => {
        axios.post("http://localhost:5071/api/GM/SaveRunSheetUsers", runSheetPayload).then(res => {
            setIsRunSheetSave(false);
        })
    }

    const addMember = () => {
        setRows([...rows, { ...initialData, slno: rows.length + 1 }])
        setIsGmSheetSave(true);
    }

    const handleChange = (evnt, ind) => {
        const { name, value } = evnt.target;
        let updatedrows = rows.map((row, i) => (
            ind == i ? {
                ...row, [name]: value
            } : row
        ))
        setRows(updatedrows)
        if (name == "payrate" || name == "location") {
            setTimeout(() => {
                setRefresh(i => !i)
            }, 100)
        }
    }

    const handleDateChange = (date, indx, stdate) => {
        if (!date) return;
        const cleanDate = `${date.getFullYear()}-${(date.getMonth() + 1)
            .toString()
            .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        if (stdate == "startdate") {
            let updatedrows = rows.map((row, i) => (
                indx == i ? {
                    ...row, [stdate]: cleanDate, enddate: row.enddate && cleanDate > row.enddate ? null :
                        row.enddate
                } : row
            ))
            setRows(updatedrows)
        }
        else {
            let updatedrows = rows.map((row, i) => (
                indx == i ? {
                    ...row, [stdate]: cleanDate
                } : row
            ))
            setRows(updatedrows)
        }
    }

    useEffect(() => {
        let updatedrows = rows.map((row, i) => {
            if (row.location == 'Onshore' && row.type == 'salaried') {
                return {
                    ...row, loadedrate: (parseInt(row.payrate) * 1.23).toFixed(2) + ""
                }
            }
            else if (row.type == 'contractor') {
                return {
                    ...row, loadedrate: (parseInt(row.payrate) * 1.05).toFixed(2) + ""
                }

            }
            else if (row.type == 'hourely') {
                return {
                    ...row, loadedrate: (parseInt(row.payrate) * 1.12).toFixed(2) + ""
                }
            }

            else if (row.type === 'employee' || row.type == 'shared') {
                return {
                    ...row, loadedrate: (parseInt(row.payrate) * 1.056).toFixed(2) + ""
                }
            }
            else if (row.location == 'Offshore') {
                return {
                    ...row, loadedrate: (parseInt(row.payrate) * 1.056).toFixed(2) + ""
                }
            }
            else {
                return row
            }
        })
        setRows(updatedrows)

    }, [refresh])

    const handleSaveGmSheet = () => {
        axios.post("http://localhost:5071/api/GM", rows).then(res => {
            setRows([]);
            setIsGmSheetSave(false);
            handleloadrunsheet();
            getdata();
            setRefreshGmSheetCalc(a => !a);
            getRunsheetSummary();
        })
    }

    const handleSaveAll = () => {
        if (isRunSheetSave) {
            handleSaveRunSheet();
        }
        if (isGmSheetSave) {
            handleSaveGmSheet();
        }
    }

    const deleteRow = (index) => {
        let deleterows = rows.filter((_, i) => index != i)
        setRows(deleterows)
        if (deleterows.length == 0) {
            setIsGmSheetSave(false);
        }
    }

    let showTextBox = 0;

    return (
        <>
            {accountId > 0 && projectId > 0 && sowId > 0 &&
                <div>
                    <div className='text-lg font-bold'>
                        Account Name: {accountdata?.account?.accountName}
                        <br />
                        Project Name: {accountdata?.project?.projectName}
                    </div>
                    {!showRunSheet &&
                        <>
                            <div className='overflow-x-auto w-full'>
                                <GmSheetCalculation accountId={accountId} projectId={projectId} refreshGmSheetCalc={refreshGmSheetCalc} />
                            </div>
                            <div className='overflow-x-auto w-full'>
                                <table className="min-w-full border border-gray-600 text-sm text-left">
                                    <thead className='bg-blue-300 py-2' >
                                        <tr className='whitespace-nowrap px-3 py-3 text-[14px]'>
                                            <th>
                                                S.No
                                            </th>
                                            <th className='px-4 py-4 border border-gray-600'>BRSPD Mgr</th>
                                            <th className='px-4 py-4 border border-gray-600'>Program</th>
                                            <th className='px-4 py-4 border border-gray-600'>Status</th>
                                            <th className='px-4 py-4 border border-gray-600'>Name</th>
                                            <th className='px-4 py-4 border border-gray-600'>Role as per SOW</th>
                                            <th className='px-4 py-4 border border-gray-600'>Durtion</th>
                                            <th className='px-4 py-4 border border-gray-600'>Start Date</th>
                                            <th className='px-4 py-4 border border-gray-600'>End Date</th>
                                            <th className='px-4 py-4 border border-gray-600'>Location</th>
                                            <th className='px-4 py-4 border border-gray-600'>Type</th>
                                            <th className='px-4 py-4 border border-gray-600'>Bill Rate</th>
                                            <th className='px-4 py-4 border border-gray-600'>Pay Rate</th>
                                            <th className='px-4 py-4 border border-gray-600'>Loaded Rate</th>
                                            <th className='px-4 py-4 border border-gray-600'>Billable</th>
                                            <th className='px-4 py-4 border border-gray-600'>Total Monthly Spend</th>
                                            <th className='px-4 py-4 border border-gray-600'>Total Year Spend</th>
                                            <th className='px-4 py-4 border border-gray-600'>Total Cost</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-600 bg-Black" style={{ backgroundColor: 'wheat' }} >
                                        {
                                            listdata.map((row, i) => (
                                                <tr className="px-6 py-4" key={"rowlst" + i}>
                                                    <td className="px-2 py-4">{i + 1}</td>
                                                    <td className="p-2 border border-gray-600">{row.brspdMgr}</td>
                                                    <td className="p-2 border border-gray-600">{row.program}</td>
                                                    <td className="p-2 border border-gray-600">{row.status}</td>
                                                    <td className="p-2 border border-gray-600">{row.name}</td>
                                                    <td className="p-2 border border-gray-600">{row.roleaspersow}</td>
                                                    <td className="p-2 border border-gray-600">{row.duration}</td>
                                                    <td className="p-2 border border-gray-600 whitespace-nowrap">{convertDate(row.startdate)}</td>
                                                    <td className="p-2 border border-gray-600 whitespace-nowrap">{convertDate(row.enddate)}</td>
                                                    <td className="p-2 border border-gray-600">{row.location}</td>
                                                    <td className="p-2 border border-gray-600">{row.type}</td>
                                                    <td className="p-2 border border-gray-600">{row.billrate}</td>
                                                    <td className="p-2 border border-gray-600">{row.payrate}</td>
                                                    <td className="p-2 border border-gray-600">{row.loadedrate ? Number(row.loadedrate).toFixed(2) : '0.00'}</td>
                                                    <td className="p-2 border border-gray-600">{row.billable}</td>
                                                    <td className='p-2 border border-gray-600'>
                                                        {row.status === 'Active' && row.billable === 'Yes' && (
                                                            <>{(row.billrate * 168).toFixed(2)}</>
                                                        )}
                                                    </td>
                                                    <td className='p-2 border border-gray-600'>
                                                        {
                                                            row.duration !== "" && (
                                                                <>{(row.billrate * 168 * row.duration).toFixed(2)} </>
                                                            )}
                                                    </td>
                                                    <td className='p-2 border border-gray-600'>
                                                        {row.status === 'Active' && row.billable === 'Yes' && (
                                                            <>{(row.loadedrate * 168 * 12).toFixed(2)}</>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <button className='text-green-700' style={{ color: 'red' }} onClick={() => handleDelete(row.id)}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-6">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </>
                    }
                    {
                        !showRunSheet &&
                        <div className='flex justify-center'>
                            <button className='bg-blue-600 text-white m-2 py-2 px-10 hover:bg-blue-800 rounded-xl text-[20px]' onClick={handleloadrunsheet}>Generate Runsheet</button>
                        </div>}

                    {showRunSheet && <>
                        <div className='flex items-start'>
                            <div className='m-4'>
                                <table className="border border-black shadow-lg">
                                    <tbody>
                                        <tr className='bg-red-200 font-semibold text-center'>
                                            <td className='px-2 py-1 border border-black' colSpan={2}>Summary (Actual + Projection)</td>
                                        </tr>
                                        <tr>
                                            <td className='px-2 py-1 border border-black'>Actual Revenue + Projection</td>
                                            <td className='px-2 py-1 border border-black text-right'>{lstrunsheetsummary?.actualrevenueprojection}</td>
                                        </tr>
                                        <tr>
                                            <td className='px-2 py-1 border border-black'>After Discount</td>
                                            <td className='px-2 py-1 border border-black text-right'>{lstrunsheetsummary?.afterdiscount}</td>
                                        </tr>
                                        <tr>
                                            <td className='px-2 py-1 border border-black'>Planned GM %</td>
                                            <td className='px-2 py-1 border border-black text-right'>{lstrunsheetsummary?.plannedgmpercentage}%</td>
                                        </tr>
                                        <tr>
                                            <td className='px-2 py-1 border border-black'>Planned GM</td>
                                            <td className='px-2 py-1 border border-black text-right'>{lstrunsheetsummary?.plannedgm}</td>
                                        </tr>
                                        <tr>
                                            <td className='px-2 py-1 border border-black'>Planned cost not to exceed</td>
                                            <td className='px-2 py-1 border border-black text-right'>{lstrunsheetsummary?.plannedcostnottoextend}</td>
                                        </tr>
                                        <tr>
                                            <td className='px-2 py-1 border border-black'>Actual Cost + Projection</td>
                                            <td className='px-2 py-1 border border-black text-right'>{lstrunsheetsummary?.actualcostprojection}</td>
                                        </tr>
                                        <tr>
                                            <td className='px-2 py-1 border border-black'>Cost Overrun / within limit</td>
                                            <td className='px-2 py-1 border border-black text-right'>{Math.abs(lstrunsheetsummary?.costoverrun)}</td>
                                        </tr>
                                        <tr>
                                            <td className='px-2 py-1 border border-black'>Projected GM</td>
                                            <td className='px-2 py-1 border border-black text-right'>{Math.abs(lstrunsheetsummary?.projectgmpercentage)}%</td>
                                        </tr>
                                        <tr>
                                            <td className='px-2 py-1 border border-black'>Balance Amount Projected</td>
                                            <td className='px-2 py-1 border border-black text-right'>{lstrunsheetsummary?.balanceamountprojected}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className='m-4'>
                                <table className="border border-black shadow-lg">
                                    <tbody>
                                        <tr className='bg-green-200 font-semibold text-center'>
                                            <td className='px-2 py-1 border border-black' colSpan={2}>Summary (YTD)</td>
                                        </tr>
                                        <tr>
                                            <td className='px-2 py-1 border border-black'>Actual Revenue YTD</td>
                                            <td className='px-2 py-1 border border-black text-right'>{lstrunsheetsummaryYTD?.actualrevenueprojection}</td>
                                        </tr>
                                        <tr>
                                            <td className='px-2 py-1 border border-black'>After Discount</td>
                                            <td className='px-2 py-1 border border-black text-right'>{lstrunsheetsummaryYTD?.afterdiscount}</td>
                                        </tr>
                                        <tr>
                                            <td className='px-2 py-1 border border-black'>Planned GM %</td>
                                            <td className='px-2 py-1 border border-black text-right'>{lstrunsheetsummaryYTD?.plannedgmpercentage}%</td>
                                        </tr>
                                        <tr>
                                            <td className='px-2 py-1 border border-black'>Planned GM</td>
                                            <td className='px-2 py-1 border border-black text-right'>{lstrunsheetsummaryYTD?.plannedgm}</td>
                                        </tr>
                                        <tr>
                                            <td className='px-2 py-1 border border-black'>Planned cost not to exceed</td>
                                            <td className='px-2 py-1 border border-black text-right'>{lstrunsheetsummaryYTD?.plannedcostnottoextend}</td>
                                        </tr>
                                        <tr>
                                            <td className='px-2 py-1 border border-black'>Actual Cost YTD</td>
                                            <td className='px-2 py-1 border border-black text-right'>{lstrunsheetsummaryYTD?.actualcostprojection}</td>
                                        </tr>
                                        <tr>
                                            <td className='px-2 py-1 border border-black'>Cost Overrun / within limit</td>
                                            <td className='px-2 py-1 border border-black text-right'>{Math.abs(lstrunsheetsummaryYTD?.costoverrun)}</td>
                                        </tr>
                                        <tr>
                                            <td className='px-2 py-1 border border-black'>Actual GM</td>
                                            <td className='px-2 py-1 border border-black text-right'>{Math.abs(lstrunsheetsummaryYTD?.projectgmpercentage)}%</td>
                                        </tr>
                                        <tr>
                                            <td className='px-2 py-1 border border-black'>Balance Amount YTD</td>
                                            <td className='px-2 py-1 border border-black text-right'>{lstrunsheetsummaryYTD?.balanceamountprojected}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className='overflow-x-auto w-full'>
                            <table className="table-fixed border-collapse border border-black text-center">
                                <thead className='bg-blue-300'>
                                    <tr className='whitespace-nowrap px-4 text-[14px]'>
                                        <th colSpan={14}></th>
                                        {
                                            runSheetTableHeaders.map((runsheetHeaders, iH) => (
                                                <th className='px-2 py-2 border border-gray-600' key={"TableHeader-" + iH}>{runsheetHeaders}</th>
                                            ))
                                        }
                                        <th colSpan={isGmSheetSave ? 5 : 4}></th>
                                    </tr>
                                    <tr className='whitespace-nowrap'>
                                        <th className='px-2 py-2 border border-gray-600'>BRSPD Mgr</th>
                                        <th className='px-2 py-2 border border-gray-600'>Program</th>
                                        <th className='px-2 py-2 border border-gray-600'>Status</th>
                                        <th className='px-2 py-2 border border-gray-600'>Name</th>
                                        <th className='px-2 py-2 border border-gray-600'>Role as per SOW</th>
                                        <th className='px-2 py-2 border border-gray-600'>Duration</th>
                                        <th className='px-2 py-2 border border-gray-600'>Start Date</th>
                                        <th className='px-2 py-2 border border-gray-600'>End Date</th>
                                        <th className='px-2 py-2 border border-gray-600'>Location</th>
                                        <th className='px-2 py-2 border border-gray-600'>Type</th>
                                        <th className='px-2 py-2 border border-gray-600'>Bill Rate</th>
                                        <th className='px-2 py-2 border border-gray-600'>Pay Rate</th>
                                        <th className='px-2 py-2 border border-gray-600'>Loaded Rate</th>
                                        <th className='px-2 py-2 border border-gray-600'>Billable</th>
                                        {
                                            runSheetTableMonthHeaders.map((runsheetHeaders, iH) => (
                                                <th className='px-2 py-2 border font-semibold whitespace-nowrap border-gray-600' key={"TableMonthHeader-" + iH}>{runsheetHeaders}</th>
                                            ))
                                        }
                                        <th className='px-2 py-2 border border-gray-600'>Total Revenue</th>
                                        <th className='px-2 py-2 border border-gray-600'>Total Cost</th>
                                        <th className='px-2 py-2 border bg-blue-600 text-white border-gray-600'>TotalRevenue(YTD)</th>
                                        <th className='px-2 py-2 border bg-blue-600 text-white border-gray-600'>TotalRevenue(YTD+Project)</th>
                                        {isGmSheetSave && <th className='px-2 py-2 border border-gray-600'></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-600 bg-Black">
                                    {
                                        listloadrunsheet.map((row, i) => (
                                            <tr key={"RunSHeetTR-" + i} className=' whitespace-nowrap'>
                                                <td className="p-2 border border-gray-600">{row.brspdMgr}</td>
                                                <td className="p-2 border border-gray-600">{row.program}</td>
                                                <td className="p-2 border border-gray-600">{row.status}</td>
                                                <td className="p-2 border border-gray-600">{row.name}</td>
                                                <td className="p-2 border border-gray-600">{row.roleaspersow}</td>
                                                <td className="p-2 border border-gray-600">{row.duration}</td>
                                                <td className="p-2 border border-gray-600 whitespace-nowrap">{convertDate(row.startdate)}</td>
                                                <td className="p-4 border border-gray-600 whitespace-nowrap">{convertDate(row.enddate)}</td>
                                                <td className="p-2 border border-gray-600">{row.location}</td>
                                                <td className="p-2 border border-gray-600">{row.type}</td>
                                                <td className="p-2 border border-gray-600">{row.billrate}</td>
                                                <td className="p-2 border border-gray-600">{row.payrate}</td>
                                                <td className="p-2 border border-gray-600">{row.loadedrate ? Number(row.loadedrate).toFixed(2) : '0.00'}</td>
                                                <td className="p-2 border border-gray-600">{row.billable}</td>
                                                {
                                                    row?.runsheet?.map((runsheetDataCh, iH) => (
                                                        <td className='px-2 py-2 border border-gray-600' key={"ch-" + iH}>
                                                            {runsheetDataCh?.isCurrentMonthActive ? <>
                                                                {
                                                                    runsheetDataCh?.currentMonth ?
                                                                        <input className='w-36 px-4 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent' type='number' value={runSheetPayload.find(a => a.GmId == row.gmId && a.month == runsheetDataCh?.month)?.hours || 0} onChange={(evt) => handleSaveRunSheetChange(evt, row.gmId, runsheetDataCh?.month)} />
                                                                        :
                                                                        runsheetDataCh?.hours
                                                                }</> : 0}
                                                        </td>
                                                    ))
                                                }
                                                {
                                                    row?.runsheet?.map((runsheetDataCost, iH) => (
                                                        <td className='px-2 py-2 border border-gray-600' key={"cost-" + iH}>{runsheetDataCost?.isCurrentMonthActive ? runsheetDataCost?.cost : 0}</td>
                                                    ))
                                                }
                                                {
                                                    row?.runsheet?.map((runsheetDataRh, iH) => (
                                                        <td className='px-2 py-2 border border-gray-600' key={"rh-" + iH}>
                                                            {runsheetDataRh?.isCurrentMonthActive ? <>
                                                                {
                                                                    runsheetDataRh?.currentMonth ?
                                                                        <input className='w-36 px-4 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent' type='number' value={runSheetPayload.find(a => a.GmId == row.gmId && a.month == runsheetDataRh?.month)?.hours || 0} onChange={(evt) => handleSaveRunSheetChange(evt, row.gmId, runsheetDataRh?.month)} />
                                                                        :
                                                                        runsheetDataRh?.hours
                                                                }</> : 0
                                                            }
                                                        </td>
                                                    ))
                                                }
                                                {
                                                    row?.runsheet?.map((runsheetDataRev, iH) => (
                                                        <td className='px-2 py-2 border border-gray-600' key={"rev-" + iH}>{runsheetDataRev?.isCurrentMonthActive ? runsheetDataRev?.hours : 0}</td>
                                                    ))
                                                }
                                                <td className="p-2 border border-gray-600">{row.totalcost}</td>
                                                <td className="p-2 border border-gray-600">{row.totalrevenue}</td>
                                                <td className="p-2 border border-gray-600">{row.totalrevenueytd}</td>
                                                <td className="p-2 border border-gray-600">{row.totalrevenueytdproject}</td>
                                                {isGmSheetSave && <td className="p-2 border border-gray-600"></td>}
                                            </tr>
                                        ))
                                    }
                                    {
                                        rows.map((row, i) => (
                                            <tr key={"RunSHeetTRNew-" + i} className=' whitespace-nowrap'>
                                                <td className="p-2 border border-gray-600">
                                                    <input className='w-36 px-4 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent' type='text' value={row.brspdMgr} name='brspdMgr' onChange={(e) => { handleChange(e, i) }} />
                                                </td>
                                                <td className="p-2 border border-gray-600">
                                                    <input className='w-36 px-4 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent' type='text' value={row.program} name='program' onChange={(e) => { handleChange(e, i) }} />
                                                </td>
                                                <td className="p-2 border border-gray-600">
                                                    <select className='w-36 px-8 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent' value={row.status} name='status' onChange={(e) => { handleChange(e, i) }}>
                                                        <option value={"Active"}>Active</option>
                                                        <option value={"InActive"}>InActive</option>
                                                    </select>
                                                </td>
                                                <td className="p-2 border border-gray-600">
                                                    <input className='w-36 px-4 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent' type='text' value={row.name} name='name' onChange={(e) => { handleChange(e, i) }} />
                                                </td>
                                                <td className="p-2 border border-gray-600">
                                                    <input className='w-36 px-4 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent' type='text' value={row.roleaspersow} name='roleaspersow' onChange={(e) => { handleChange(e, i) }} />
                                                </td>
                                                <td className="p-2 border border-gray-600">
                                                    <input type='number' min={1} className='w-36 px-4 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent' value={row.duration} name='duration' onChange={(e) => { handleChange(e, i) }} />
                                                </td>
                                                <td className="p-2 border border-gray-600 whitespace-nowrap">
                                                    <DatePicker className='px-2 py-2 w-36 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                                                        selected={row.startdate ? new Date(row.startdate + 'T00:00:00') : null}
                                                        onChange={(d) => handleDateChange(d, i, "startdate")}
                                                        placeholderText={`Select Date`}
                                                        dateFormat={'dd/MM/yyyy'}
                                                    />
                                                </td>
                                                <td className="p-4 border border-gray-600 whitespace-nowrap">
                                                    <DatePicker className='px-2 py-2 w-36 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                                                        selected={row.enddate ? new Date(row.enddate + 'T00:00:00') : null}
                                                        onChange={(d) => handleDateChange(d, i, "enddate")}
                                                        placeholderText={`Select Date`}
                                                        startDate={row.startdate ? new Date(row.startdate + 'T00:00:00') : null}
                                                        minDate={row.startdate ? new Date(row.startdate + 'T00:00:00') : null}
                                                        disabled={!row.startdate}
                                                        dateFormat={'dd/MM/yyyy'}
                                                    />
                                                </td>
                                                <td className="p-2 border border-gray-600">
                                                    <select className='w-36 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent' value={row.location} name='location' onChange={(e) => { handleChange(e, i) }}>
                                                        <option value={"Offshore"}>Offshore</option>
                                                        <option value={"Onshore"}>Onshore</option>
                                                    </select>
                                                </td>
                                                <td className="p-2 border border-gray-600">
                                                    <select className='w-36 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent' value={row.type} name='type' onChange={(e) => { handleChange(e, i) }}>
                                                        <option value={"salaried"}>Salaried</option>
                                                        <option value={"contractor"}>Contractor</option>
                                                        <option value={"hourely"}>Hourely</option>
                                                        <option value={"employee"}>Employee</option>
                                                        <option value={"shared"}>Shared</option>
                                                    </select>
                                                </td>
                                                <td className="p-2 border border-gray-600">
                                                    <input type='number' className='w-36 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent' value={row.billrate} name='billrate' min={1} maxLength={5} onChange={(e) => { handleChange(e, i) }} />
                                                </td>
                                                <td className="p-2 border border-gray-600">
                                                    <input type='number' className='w-36 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent' value={row.payrate} name='payrate' min={1} maxLength={5} onChange={(e) => { handleChange(e, i) }} />
                                                </td>
                                                <td className="p-2 border border-gray-600"><input className='w-36 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent' type='text' value={row.loadedrate} readOnly /></td>
                                                <td className="p-2 border border-gray-600">
                                                    <select className='w-36 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent' value={row.billable} name='billable' onChange={(e) => { handleChange(e, i) }}>
                                                        <option value={"Yes"}>Yes</option>
                                                        <option value={"No"}>No</option>
                                                    </select>
                                                </td>
                                                {
                                                    runSheetTableMonthHeaders.map((runsheetHeaders, iH) => {
                                                        if (currentMonthYear === runsheetHeaders) {
                                                            showTextBox++;
                                                        }
                                                        return (<td className='px-2 py-2 border border-gray-600' key={"TableBodYNew-" + iH}>{(runsheetHeaders === currentMonthYear && showTextBox % 2 == 1) ?
                                                            <input className='w-36 px-4 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent' type='number' name='hours' value={row.hours} onChange={(evt) => handleChange(evt, i)} />
                                                            : 0
                                                        }</td>
                                                        )
                                                    })
                                                }
                                                <td className="p-2 border border-gray-600">{row.totalcost}</td>
                                                <td className="p-2 border border-gray-600">{row.totalrevenue}</td>
                                                <td className="p-2 border border-gray-600">{row.totalrevenueytd}</td>
                                                <td className="p-2 border border-gray-600">{row.totalrevenueytdproject}</td>
                                                <td className="p-2 border border-gray-600">
                                                    <button className='text-red-600 py-2 px-2 rounded hover:text-red-800 transition-colors' type='button' onClick={() => deleteRow(i)}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-8">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                        <div className='flex justify-end'>
                            <button className='bg-blue-600 text-white m-2 py-2 px-10 hover:bg-blue-800 rounded-xl text-[20px]' onClick={downloadExcel}>Export to Excel</button>
                            {(isRunSheetSave || isGmSheetSave) &&
                                <button className='bg-green-600 text-white m-2 py-2 px-10 hover:bg-green-800 rounded-xl text-[20px]' onClick={handleSaveAll}>Save RunSheet</button>
                            }
                            <button className='bg-purple-600 text-white m-2 py-2 px-10 hover:bg-purple-800 rounded-xl text-[20px]' onClick={addMember}>Add Member</button>
                        </div>
                    </>
                    }
                    {showRunSheet &&
                        <div className='flex justify-center'>
                            <button className='bg-red-600 text-white m-2 py-2 px-10 hover:bg-red-800 rounded-xl text-[20px]' onClick={() => setShowRunSheet(false)}>Close Runsheet</button>
                        </div>}
                </div>
            }
        </>
    )
}
export default OpenGM
