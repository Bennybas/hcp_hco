"use client"

import { useEffect, useState, useRef } from "react"
import { FaUserDoctor } from "react-icons/fa6"
import api from "../api/api"
import USAMap from "./Map2"
import { ChevronDown, X } from "lucide-react"
import * as echarts from "echarts/core"
import { TooltipComponent, GridComponent, VisualMapComponent, LegendComponent } from "echarts/components"
import { HeatmapChart } from "echarts/charts"
import { CanvasRenderer } from "echarts/renderers"
import { useNavigate } from "react-router-dom"
import { PropagateLoader } from "react-spinners"

const OverviewV2 = () => {

  const navigate = useNavigate();
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState([])
  const [hcpCount, setHcpCount] = useState(0)
  const [treeMapData, setTreeMapData] = useState(null)
  const [filterOptions, setFilterOptions] = useState({
    year: [],
    hcoTerritory: [],
    product: [],
    accountGrouping: [],
    hcpSegment: [],
    patientAgeGroup: [],
  })
  const [selectedFilters, setSelectedFilters] = useState({
    year: [],
    hcoTerritory: [],
    product: [],
    accountGrouping: [],
    hcpSegment: [],
    patientAgeGroup: [],
  })
  const [showFilterDropdown, setShowFilterDropdown] = useState({
    year: false,
    hcoTerritory: false,
    product: false,
    accountGrouping: false,
    hcpSegment: false,
    patientAgeGroup: false,
  })
  const [filteredData, setFilteredData] = useState([])
  const [heatmapData, setHeatmapData] = useState({
    xCategories: [],
    yCategories: [],
    data: [],
  })

  const chartRef = useRef(null)
  const myChartRef = useRef(null)

  // Define color scheme for different groups
  const colors = {
    "CURRENT IV": "#4caf50",
    "IV AFFILIATES": "#2196f3",
    "NEW IT TREATMENT CENTERS": "#ffeb3b",
    "NEW TREATMENT CENTERS": "#f44336",
    UNSPECIFIED: "#9e9e9e",
  }

  // Cell background colors for heatmap
  const cellColors = {
    "CURRENT IV": "#d1e7dd",
    "IV AFFILIATES": "#cfe2ff",
    "NEW IT TREATMENT CENTERS": "#fff3cd",
    "NEW TREATMENT CENTERS": "#f8d7da",
    UNSPECIFIED: "#e2e3e5",
  }

  // Fixed order for heatmap rows (y-axis)
  const fixedYOrder = ["Adults Only-Medicare", "Adults Only-Non Medicare", "Ped Only", "Ped+Adults"]

  // Fixed order for heatmap columns (x-axis)
  const fixedXOrder = [
    "CURRENT IV",
    "IV AFFILIATES",
    "NEW IT TREATMENT CENTERS",
    "NEW TREATMENT CENTERS",
    "UNSPECIFIED",
  ]

  const calculateHCPStats = (data) => {
    // When territory filter is applied
    const territoryFilter = selectedFilters.hcoTerritory.length > 0

    // Initialize sets for tracking unique entities
    const patientSet = new Set()
    const renderingHCPs = new Set()
    const referringHCPs = new Set()
    const totalHCPs = new Set()

    const renderingHCOs = new Set()
    const referringHCOs = new Set()
    const totalHCOs = new Set()
    const zolgensmaPrescribingHCOs = new Set()

    // For Top 10 HCPs
    const hcpPatientMap = new Map()
    // For Top 10 HCOs
    const hcoPatientMap = new Map()

    data.forEach((item) => {
      if (item.patient_id) {
        patientSet.add(item.patient_id)
      }

      // Logic for rendering HCPs with territory filter
      if (item.hcp_id && item.hcp_id !== "-") {
        if (!territoryFilter || (territoryFilter && selectedFilters.hcoTerritory.includes(item.rend_hco_terr_name))) {
          renderingHCPs.add(item.hcp_id)
          totalHCPs.add(item.hcp_id)

          // HCP logic for Top 10
          const key = `${item.hcp_id}|${item.hcp_name}|${item.final_spec}|${item.zolgensma_iv_target}`
          if (!hcpPatientMap.has(key)) hcpPatientMap.set(key, new Set())
          hcpPatientMap.get(key).add(item.patient_id)
        }
      }

      // Logic for referring HCPs with territory filter
      if (item.ref_npi && item.ref_npi !== "-") {
        if (!territoryFilter || (territoryFilter && selectedFilters.hcoTerritory.includes(item.ref_hco_terr_name))) {
          referringHCPs.add(item.ref_npi)
          totalHCPs.add(item.ref_npi)
        }
      }

      // Logic for rendering HCOs with territory filter
      if (item.hco_mdm && item.hco_mdm !== "-") {
        if (!territoryFilter || (territoryFilter && selectedFilters.hcoTerritory.includes(item.rend_hco_terr_name))) {
          renderingHCOs.add(item.hco_mdm)
          totalHCOs.add(item.hco_mdm)

          // HCO logic for Top 10
          const key = `${item.hco_mdm}|${item.hco_mdm_name}|${item.hco_grouping}`
          if (!hcoPatientMap.has(key)) hcoPatientMap.set(key, new Set())
          hcoPatientMap.get(key).add(item.patient_id)
        }
      }

      // Logic for referring HCOs with territory filter
      if (item.ref_hco_npi_mdm && item.ref_hco_npi_mdm !== "-") {
        if (!territoryFilter || (territoryFilter && selectedFilters.hcoTerritory.includes(item.ref_hco_terr_name))) {
          referringHCOs.add(item.ref_hco_npi_mdm)
          totalHCOs.add(item.ref_hco_npi_mdm)
        }
      }

      if (
        item.zolg_prescriber &&
        item.zolg_prescriber.toLowerCase() === "yes" &&
        item.hco_mdm &&
        item.hco_mdm !== "-"
      ) {
        if (!territoryFilter || (territoryFilter && selectedFilters.hcoTerritory.includes(item.rend_hco_terr_name))) {
          zolgensmaPrescribingHCOs.add(item.hco_mdm)
        }
      }
    })

    // Calculate Top 10 HCPs from the filtered data
    const top10HCPs = Array.from(hcpPatientMap.entries())
      .map(([key, patients]) => {
        const [hcp_id, hcp_name, final_spec, zolgensma_iv_target] = key.split("|")
        return {
          hcp_id,
          hcp_name,
          speciality: final_spec,
          zolgensma_iv_target,
          patient_count: patients.size,
        }
      })
      .sort((a, b) => b.patient_count - a.patient_count)
      .slice(0, 10)
      .map((hcp, index) => ({ rank: index + 1, ...hcp }))

    // Calculate Top 10 HCOs from the filtered data
    const top10HCOs = Array.from(hcoPatientMap.entries())
      .map(([key, patients]) => {
        const [hco_mdm, hco_mdm_name, hco_grouping] = key.split("|")
        return {
          hco_mdm,
          hco_mdm_name,
          hco_grouping,
          archytype: "", // as requested
          patient_count: patients.size,
        }
      })
      .sort((a, b) => b.patient_count - a.patient_count)
      .slice(0, 10)
      .map((hco, index) => ({ rank: index + 1, ...hco }))

    return {
      totalPatients: patientSet.size,
      totalHcpCount: totalHCPs.size,
      renderingHcpCount: renderingHCPs.size,
      referringHcpCount: referringHCPs.size,
      totalHcoCount: totalHCOs.size,
      renderingHcoCount: renderingHCOs.size,
      referringHcoCount: referringHCOs.size,
      zolgensmaPrescribingHcoCount: zolgensmaPrescribingHCOs.size,
      avgPatientsPerRenderingHCP: renderingHCPs.size ? (patientSet.size / renderingHCPs.size).toFixed(2) : 0,
      avgPatientsPerReferringHCP: referringHCPs.size ? (patientSet.size / referringHCPs.size).toFixed(2) : 0,
      avgPatientsPerRenderingHCO: renderingHCOs.size ? (patientSet.size / renderingHCOs.size).toFixed(2) : 0,
      avgPatientsPerReferringHCO: referringHCOs.size ? (patientSet.size / referringHCOs.size).toFixed(2) : 0,
      top10HCPs,
      top10HCOs,
    }
  }
  // Extract unique filter options from data
  const extractFilterOptions = (data) => {
    const years = new Set()
    const hcoTerritories = new Set()
    const products = new Set()
    const accountGroupings = new Set()
    const hcpSegments = new Set()
    const patientAgeGroups = new Set()

    data.forEach((item) => {
      if (item.year) years.add(item.year)

      if (item.rend_hco_terr_name && item.rend_hco_terr_name !== "-") hcoTerritories.add(item.rend_hco_terr_name)

      if (item.ref_hco_terr_name && item.ref_hco_terr_name !== "-") hcoTerritories.add(item.ref_hco_terr_name)

      if (item.drug_name) products.add(item.drug_name)

      if (item.hco_grouping && item.hco_grouping !== "-") accountGroupings.add(item.hco_grouping)

      if (item.hcp_segment) hcpSegments.add(item.hcp_segment)

      if (item.l2y_hcp_pts_potential_across_age && item.l2y_hcp_pts_potential_across_age !== "-")
        patientAgeGroups.add(item.l2y_hcp_pts_potential_across_age)
    })

    setFilterOptions({
      year: Array.from(years).sort(),
      hcoTerritory: Array.from(hcoTerritories).sort(),
      product: Array.from(products).sort(),
      accountGrouping: Array.from(accountGroupings).sort(),
      hcpSegment: Array.from(hcpSegments).sort(),
      patientAgeGroup: Array.from(patientAgeGroups).sort(),
    })
  }

  // Apply filters to data
  const applyFilters = () => {
    let filtered = [...data]

    if (selectedFilters.year.length > 0) {
      filtered = filtered.filter((item) => selectedFilters.year.includes(item.year))
    }

    if (selectedFilters.hcoTerritory.length > 0) {
      filtered = filtered.filter((item) => {
        // Check both rendering and referring territories
        return (
          (item.rend_hco_terr_name && selectedFilters.hcoTerritory.includes(item.rend_hco_terr_name)) ||
          (item.ref_hco_terr_name && selectedFilters.hcoTerritory.includes(item.ref_hco_terr_name))
        )
      })
    }

    if (selectedFilters.product.length > 0) {
      filtered = filtered.filter((item) => selectedFilters.product.includes(item.drug_name))
    }

    if (selectedFilters.accountGrouping.length > 0) {
      filtered = filtered.filter((item) => selectedFilters.accountGrouping.includes(item.hco_grouping))
    }

    if (selectedFilters.hcpSegment.length > 0) {
      filtered = filtered.filter((item) => selectedFilters.hcpSegment.includes(item.hcp_segment))
    }

    if (selectedFilters.patientAgeGroup.length > 0) {
      filtered = filtered.filter((item) =>
        selectedFilters.patientAgeGroup.includes(item.l2y_hcp_pts_potential_across_age),
      )
    }

    setFilteredData(filtered)
    const stats = calculateHCPStats(filtered)
    setStats(stats)
    generateHeatmapData(filtered)

    // Notify the map component that filters have changed
    if (typeof window !== "undefined") {
      const event = new CustomEvent("filtersChanged", {
        detail: { filters: selectedFilters },
      })
      window.dispatchEvent(event)
    }
  }

  // Toggle filter selection
  const toggleFilter = (filterType, value) => {
    setSelectedFilters((prev) => {
      const newFilters = { ...prev }
      if (newFilters[filterType].includes(value)) {
        newFilters[filterType] = newFilters[filterType].filter((item) => item !== value)
      } else {
        newFilters[filterType] = [...newFilters[filterType], value]
      }
      return newFilters
    })
  }

  // Toggle filter dropdown
  const toggleFilterDropdown = (filterType) => {
    setShowFilterDropdown((prev) => {
      const newState = { ...prev }
      Object.keys(newState).forEach((key) => {
        newState[key] = key === filterType ? !prev[key] : false
      })
      return newState
    })
  }

  // Generate heatmap data from filtered data
  const generateHeatmapData = (filteredData) => {
    // Clean data
    const cleanedData = filteredData
      .map((item) => {
        const newItem = { ...item }

        if (newItem.hco_grouping) {
          newItem.hco_grouping = newItem.hco_grouping.replace("-", "").replace("DELETE", "UNSPECIFIED")
          // Also handle empty or blank values
          if (newItem.hco_grouping.trim() === "") {
            newItem.hco_grouping = "UNSPECIFIED"
          }
        } else {
          // If hco_grouping is null or undefined, set it to UNSPECIFIED
          newItem.hco_grouping = "UNSPECIFIED"
        }

        // Clean l2y_hcp_pts_potential_across_age - replace '-' with ''
        if (newItem.l2y_hcp_pts_potential_across_age) {
          newItem.l2y_hcp_pts_potential_across_age = newItem.l2y_hcp_pts_potential_across_age.replace("-", "")
        }

        return newItem
      })
      .filter((item) => item.l2y_hcp_pts_potential_across_age && item.l2y_hcp_pts_potential_across_age.trim() !== "")

    // Create pivot table
    const pivot = {}

    cleanedData.forEach((item) => {
      const ageCategory = item.l2y_hcp_pts_potential_across_age
      const hcoGrouping = item.hco_grouping
      const hcpId = item.hcp_id

      // Initialize the ageCategory in pivot if it doesn't exist
      if (!pivot[ageCategory]) {
        pivot[ageCategory] = {}
      }

      // Initialize the HCO grouping in the ageCategory if it doesn't exist
      if (!pivot[ageCategory][hcoGrouping]) {
        pivot[ageCategory][hcoGrouping] = new Set() // Using Set to count distinct hcp_id
      }

      // Add the hcp_id to the Set
      if (hcpId) {
        pivot[ageCategory][hcoGrouping].add(hcpId)
      }
    })

    // Calculate Grand Total row and column
    const grandTotalRow = {}
    let grandTotal = 0

    Object.keys(pivot).forEach((ageCategory) => {
      let rowTotal = 0

      Object.keys(pivot[ageCategory]).forEach((hcoGrouping) => {
        const distinctCount = pivot[ageCategory][hcoGrouping].size // Get distinct hcp_id count
        rowTotal += distinctCount

        // Add to the Grand Total Column
        if (!grandTotalRow[hcoGrouping]) {
          grandTotalRow[hcoGrouping] = new Set()
        }

        // Add all hcp_ids from this cell to the column total
        pivot[ageCategory][hcoGrouping].forEach((hcpId) => {
          grandTotalRow[hcoGrouping].add(hcpId)
        })

        // If this is the first row, initialize Grand Total for this row
        if (!pivot[ageCategory]["Grand Total"]) {
          pivot[ageCategory]["Grand Total"] = new Set()
        }

        // Add all hcp_ids from this cell to the row total
        pivot[ageCategory][hcoGrouping].forEach((hcpId) => {
          pivot[ageCategory]["Grand Total"].add(hcpId)
        })
      })

      // Add to the global Grand Total
      grandTotal += pivot[ageCategory]["Grand Total"].size
    })

    // Add 'Grand Total' row
    pivot["Grand Total"] = grandTotalRow

    // Add the overall grand total
    const allHcpIds = new Set()
    cleanedData.forEach((item) => {
      if (item.hcp_id) {
        allHcpIds.add(item.hcp_id)
      }
    })
    pivot["Grand Total"]["Grand Total"] = allHcpIds

    // Convert pivot table to heatmap data format
    // Get unique categories for x and y axes
    const yCategories = Object.keys(pivot).filter((y) => y !== "Grand Total")
    yCategories.sort((a, b) => {
      // Use fixed order if available
      const aIndex = fixedYOrder.indexOf(a)
      const bIndex = fixedYOrder.indexOf(b)

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex
      } else if (aIndex !== -1) {
        return -1
      } else if (bIndex !== -1) {
        return 1
      } else {
        return a.localeCompare(b)
      }
    })
    yCategories.push("Grand Total") // Add Grand Total at the end

    const xCategories = new Set()
    Object.values(pivot).forEach((row) => {
      Object.keys(row).forEach((x) => {
        if (x !== "Grand Total") {
          xCategories.add(x)
        }
      })
    })

    // Convert to array and sort
    const xCategoriesArray = Array.from(xCategories)
    // Filter out empty strings and replace with UNSPECIFIED
    const processedXCategories = xCategoriesArray.filter((category) => category !== "")
    if (xCategoriesArray.includes("") && !processedXCategories.includes("UNSPECIFIED")) {
      processedXCategories.push("UNSPECIFIED")
    } else if (xCategoriesArray.includes("") && processedXCategories.includes("UNSPECIFIED")) {
      // Empty string is already represented by UNSPECIFIED
    }

    // Sort the categories
    processedXCategories.sort((a, b) => {
      // Use fixed order if available
      const aIndex = fixedXOrder.indexOf(a)
      const bIndex = fixedXOrder.indexOf(b)

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex
      } else if (aIndex !== -1) {
        return -1
      } else if (bIndex !== -1) {
        return 1
      } else {
        return a.localeCompare(b)
      }
    })
    processedXCategories.push("Grand Total") // Add Grand Total at the end

    // Create data array for heatmap
    const data = []
    const totalHcps = allHcpIds.size

    yCategories.forEach((y, yIndex) => {
      processedXCategories.forEach((x, xIndex) => {
        if (x === "UNSPECIFIED") {
          // Combine counts from both UNSPECIFIED and empty string
          const count = (pivot[y]?.["UNSPECIFIED"]?.size || 0) + (pivot[y]?.[""]?.size || 0)
          const percentage = totalHcps > 0 ? Math.round((count / totalHcps) * 100) : 0
          data.push([xIndex, yIndex, percentage, count])
        } else {
          const count = pivot[y]?.[x]?.size || 0
          const percentage = totalHcps > 0 ? Math.round((count / totalHcps) * 100) : 0
          data.push([xIndex, yIndex, percentage, count])
        }
      })
    })

    setHeatmapData({
      xCategories: processedXCategories,
      yCategories,
      data,
    })

    // Update the chart if it exists
    if (myChartRef.current) {
      updateHeatmapChart()
    }
  }

  // Update the heatmap chart with current data
  const updateHeatmapChart = () => {
    if (!myChartRef.current || !heatmapData.data.length) return

    const option = {
      tooltip: {
        position: "top",
        formatter: (params) => {
          const count = params.data[3]
          const percentage = params.data[2]
          return `<div style="font-size: 9px">
          ${heatmapData.yCategories[params.data[1]]}<br>
          ${heatmapData.xCategories[params.data[0]]}<br>
          Count: ${count}<br>
          Percentage: ${percentage}%
        </div>`
        },
        textStyle: {
          fontSize: 9,
        },
      },
      grid: {
        height: "85%",
        width: "82%",
        top: "15%",
        left: "17%",
      },
      xAxis: {
        type: "category",
        data: heatmapData.xCategories,
        position: "top",
        axisLabel: {
          fontSize: 10,
          interval: 0,
          rotate: 0,
        },
        splitArea: {
          show: true,
        },
      },
      yAxis: {
        type: "category",
        data: heatmapData.yCategories,
        axisLabel: {
          fontSize: 10,
        },
        splitArea: {
          show: true,
        },
        inverse: true, // This ensures the Grand Total is at the bottom
      },
      visualMap: {
        min: 0,
        max: 100,
        calculable: false,
        orient: "horizontal",
        left: "center",
        bottom: "0%",
        show: false,
      },
      series: [
        {
          name: "HCP Distribution",
          type: "heatmap",
          data: heatmapData.data,
          label: {
            show: true,
            formatter: (params) => {
              const count = params.data[3]
              const percentage = params.data[2]
              return `${count} (${percentage}%)`
            },
            fontSize: 9,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 5,
              shadowColor: "rgba(0, 0, 0, 0.3)",
            },
          },
          itemStyle: {
            color: (params) => {
              const [yIndex, xIndex] = params.data
              const xValue = heatmapData.xCategories[xIndex]
              const percentage = params.data[2]

              // For Grand Total row and column cells
              if (yIndex === heatmapData.yCategories.length - 1 || xIndex === heatmapData.xCategories.length - 1) {
                // Use a light yellow background for totals
                return "#fff8e1"
              }

              // Use mapped color if available
              if (cellColors[xValue]) {
                // Adjust opacity based on percentage
                const baseColor = cellColors[xValue]
                if (percentage > 20) {
                  return baseColor // Full opacity for high percentages
                } else if (percentage > 10) {
                  return baseColor // Slightly less opacity
                } else {
                  return baseColor // Even less opacity
                }
              }

              return "#ffffff" // Default color
            },
          },
        },
      ],
      devicePixelRatio: window.devicePixelRatio || 1
    }

    myChartRef.current.setOption(option)
  }

  // Handle heatmap filter clicks
  const handleHeatmapFilter = (type, value) => {
    if (type === "x") {
      // Filter by x-axis (hco_grouping)
      if (value !== "Grand Total") {
        toggleFilter("accountGrouping", value)
      }
    } else if (type === "y") {
      // Filter by y-axis (l2y_hcp_pts_potential_across_age)
      if (value !== "Grand Total") {
        toggleFilter("patientAgeGroup", value)
      }
    } else if (type === "cell") {
      // Filter by both x and y
      if (value.x !== "Grand Total" && value.y !== "Grand Total") {
        toggleFilter("accountGrouping", value.x)
        toggleFilter("patientAgeGroup", value.y)
      }
    }
  }

  const initHeatmapChart = () => {
    echarts.use([TooltipComponent, GridComponent, VisualMapComponent, HeatmapChart, CanvasRenderer, LegendComponent])

    const chartDom = chartRef.current
    const chart = echarts.init(chartDom, null, {
      renderer: "canvas",
    })
    myChartRef.current = chart

    // Set up click event handler
    myChartRef.current.on("click", (params) => {
      const [xIndex, yIndex] = params.data

      // Handle row click (y-axis)
      if (xIndex === heatmapData.xCategories.length - 1) {
        const selectedYValue = heatmapData.yCategories[yIndex]
        // Filter by the selected y-axis value
        handleHeatmapFilter("y", selectedYValue)
      }
      // Handle column click (x-axis)
      else if (yIndex === heatmapData.yCategories.length - 1) {
        const selectedXValue = heatmapData.xCategories[xIndex]
        // Filter by the selected x-axis value
        handleHeatmapFilter("x", selectedXValue)
      }
      // Handle cell click
      else {
        const selectedYValue = heatmapData.yCategories[yIndex]
        const selectedXValue = heatmapData.xCategories[xIndex]
        // Filter by both x and y values
        handleHeatmapFilter("cell", { x: selectedXValue, y: selectedYValue })
      }
    })

    updateHeatmapChart()

    // Handle resize
    const resizeHandler = () => {
      myChartRef.current.resize()
    }
    window.addEventListener("resize", resizeHandler)

    // Cleanup function to dispose of the chart when the component unmounts
    return () => {
      window.removeEventListener("resize", resizeHandler)
      myChartRef.current?.dispose()
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${api}/overview`)
        const responseData = await res.json()
        setData(responseData)
        setFilteredData(responseData)
        const result = calculateHCPStats(responseData)
        setStats(result)
        extractFilterOptions(responseData)
        generateHeatmapData(responseData)
      } catch (error) {
        console.error("Failed to fetch or process data:", error)
        setError(error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Apply filters when selected filters change
  useEffect(() => {
    if (data.length > 0) {
      applyFilters()
    }
  }, [selectedFilters])

  // Initialize heatmap chart after data is loaded
  useEffect(() => {
    let cleanup
    if (!loading && chartRef.current) {
      cleanup = initHeatmapChart()
    }
    return () => {
      if (cleanup) {
        cleanup()
      }
    }
  }, [loading, chartRef.current, heatmapData])

  // Listen for territory selection from the map
  useEffect(() => {
    const handleTerritorySelected = (event) => {
      const { territories } = event.detail

      // Update the territory filter based on map selection
      setSelectedFilters((prev) => ({
        ...prev,
        hcoTerritory: territories,
      }))
    }

    window.addEventListener("territorySelected", handleTerritorySelected)

    return () => {
      window.removeEventListener("territorySelected", handleTerritorySelected)
    }
  }, [])

  const filters = [
    { key: "year", label: "Year" },
    { key: "hcoTerritory", label: "HCO Territory" },
    { key: "product", label: "Product" },
    { key: "accountGrouping", label: "Account Grouping" },
    { key: "hcpSegment", label: "HCP Segment" },
    { key: "patientAgeGroup", label: "Patient Age Group" },
  ]


  const getHCPDetails = (hcpName) => {
    navigate("/hcp", { state: { hcp_name: hcpName } })
  }

  const getHCODetails = (hcoId) => {
    navigate("/hco", { state: { hco_id: hcoId } })
    console.log("/hco", hcoId)
  }

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center h-screen">
          <PropagateLoader color="#0460A9" size={10} />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center text-red-500">
            <p>Error loading data. Please try again later.</p>
          </div>
        </div>
      ) : stats ? (
        <>
          <div className="flex flex-wrap gap-2 p-2">
            {filters.map((filter) => (
              <div key={filter.key} className="relative">
                <div
                  className={`flex items-center gap-2 bg-white rounded-lg p-1 cursor-pointer ${
                    selectedFilters[filter.key].length > 0 ? "border border-blue-500" : ""
                  }`}
                  onClick={() => toggleFilterDropdown(filter.key)}
                >
                  <span className="text-gray-700 text-[12px]">{filter.label}</span>
                  {selectedFilters[filter.key].length > 0 && (
                    <span className="bg-blue-500 text-white rounded-full text-[10px] px-1.5">
                      {selectedFilters[filter.key].length}
                    </span>
                  )}
                  <ChevronDown className="text-gray-700 w-3 h-3" />
                </div>

                {showFilterDropdown[filter.key] && (
                  <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-2 w-64 max-h-60 overflow-y-auto">
                    {filterOptions[filter.key].map((option) => (
                      <div
                        key={option}
                        className="flex items-center mb-2 hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                      >
                        <input
                          type="checkbox"
                          id={`${filter.key}-${option}`}
                          checked={selectedFilters[filter.key].includes(option)}
                          onChange={() => toggleFilter(filter.key, option)}
                          className="mr-2"
                        />
                        <label htmlFor={`${filter.key}-${option}`} className="text-[10px] cursor-pointer">
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Selected filters display */}
            {Object.entries(selectedFilters).some(([_, values]) => values.length > 0) && (
              <div className="flex flex-wrap gap-1 ml-2 items-center">
                {Object.entries(selectedFilters).map(([key, values]) =>
                  values.map((value) => (
                    <div
                      key={`${key}-${value}`}
                      className="flex items-center bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 text-xs"
                    >
                      <span>{value}</span>
                      <X className="ml-1 w-3 h-3 cursor-pointer" onClick={() => toggleFilter(key, value)} />
                    </div>
                  )),
                )}
              </div>
            )}
          </div>

          <div className="flex gap-4 w-full p-2">
            <div className="flex flex-col w-[29%] gap-2 mt-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
                  <div className="flex gap-2 items-center">
                    <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                      <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
                    </div>
                    <span className="text-gray-500 text-[11px] font-[500]">Total HCPs</span>
                  </div>
                  <span className="text-gray-700 text-[16px] font-[500] pl-2">
                    {stats.totalHcpCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
                  <div className="flex gap-2 items-center">
                    <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                      <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
                    </div>
                    <span className="text-gray-500 text-[11px] font-[500]">Total Treated Patients</span>
                  </div>
                  <span className="text-gray-700 text-[16px] font-[500] pl-2">
                    {stats.totalPatients.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
                  <div className="flex gap-2 items-center">
                    <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                      <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
                    </div>
                    <span className="text-gray-500 text-[11px] font-[500]">Treating HCPs</span>
                  </div>
                  <span className="text-gray-700 text-[16px] font-[500] pl-2">
                    {stats.renderingHcpCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
                  <div className="flex gap-2 items-center">
                    <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                      <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
                    </div>
                    <span className="text-gray-500 text-[11px] font-[500]">Avg.Patient per Ren.HCPs</span>
                  </div>
                  <span className="text-gray-700 text-[16px] font-[500] pl-2">
                    {stats.avgPatientsPerRenderingHCP.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
                  <div className="flex gap-2 items-center">
                    <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                      <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
                    </div>
                    <span className="text-gray-500 text-[11px] font-[500]">Referring HCPs</span>
                  </div>
                  <span className="text-gray-700 text-[16px] font-[500] pl-2">
                    {stats.referringHcpCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
                  <div className="flex gap-2 items-center">
                    <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                      <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
                    </div>
                    <span className="text-gray-500 text-[11px] font-[500]">Avg.Patient per Ref.HCPs</span>
                  </div>
                  <span className="text-gray-700 text-[16px] font-[500] pl-2">
                    {stats.avgPatientsPerReferringHCP.toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
                  <div className="flex gap-2 items-center">
                    <div className="bg-[#e74a21]/10 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                      <FaUserDoctor className="text-[#e74a21] h-[0.8rem] w-[0.8rem]" />
                    </div>
                    <span className="text-gray-500 text-[11px] font-[500]">Total HCOs</span>
                  </div>
                  <span className="text-gray-700 text-[16px] font-[500] pl-2">
                    {stats.totalHcoCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
                  <div className="flex gap-2 items-center">
                    <div className="bg-[#e74a21]/10 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                      <FaUserDoctor className="text-[#e74a21] h-[0.8rem] w-[0.8rem]" />
                    </div>
                    <span className="text-gray-500 text-[11px] font-[500]">Zolgensma Prescribing HCOs</span>
                  </div>
                  <span className="text-gray-700 text-[16px] font-[500] pl-2">
                    {stats.zolgensmaPrescribingHcoCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
                  <div className="flex gap-2 items-center">
                    <div className="bg-[#e74a21]/10 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                      <FaUserDoctor className="text-[#e74a21] h-[0.8rem] w-[0.8rem]" />
                    </div>
                    <span className="text-gray-500 text-[11px] font-[500]">Treating HCOs</span>
                  </div>
                  <span className="text-gray-700 text-[16px] font-[500] pl-2">
                    {stats.renderingHcoCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
                  <div className="flex gap-2 items-center">
                    <div className="bg-[#e74a21]/10 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                      <FaUserDoctor className="text-[#e74a21] h-[0.8rem] w-[0.8rem]" />
                    </div>
                    <span className="text-gray-500 text-[11px] font-[500]">Avg.Patients per Ren.HCOs</span>
                  </div>
                  <span className="text-gray-700 text-[16px] font-[500] pl-2">
                    {stats.avgPatientsPerRenderingHCO.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
                  <div className="flex gap-2 items-center">
                    <div className="bg-[#e74a21]/10 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                      <FaUserDoctor className="text-[#e74a21] h-[0.8rem] w-[0.8rem]" />
                    </div>
                    <span className="text-gray-500 text-[11px] font-[500]">Referring HCOs</span>
                  </div>
                  <span className="text-gray-700 text-[16px] font-[500] pl-2">
                    {stats.referringHcoCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
                  <div className="flex gap-2 items-center">
                    <div className="bg-[#e74a21]/10 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                      <FaUserDoctor className="text-[#e74a21] h-[0.8rem] w-[0.8rem]" />
                    </div>
                    <span className="text-gray-500 text-[11px] font-[500]">Avg.Patients per Ref.HCOs</span>
                  </div>
                  <span className="text-gray-700 text-[16px] font-[500] pl-2">
                    {stats.avgPatientsPerReferringHCO.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col w-[71%] gap-2">
              <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full p-2">
                <div className="flex gap-2 items-center mb-2">
                  <div className="bg-blue-100 rounded-full h-6 w-6 flex justify-center items-center">
                    <FaUserDoctor className="text-blue-800 h-3 w-3" />
                  </div>
                  <span className="text-gray-500 text-xs font-medium">
                    HCP Distribution by Patient Age Group and HCO Grouping
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center w-full">
                  <div ref={chartRef} className="w-full h-40" />
                </div>
              </div>

              <USAMap
                selectedTerritories={selectedFilters.hcoTerritory}
                selectedYears={selectedFilters.year}
                selectedHcpSegment={selectedFilters.hcpSegment.length > 0 ? selectedFilters.hcpSegment[0] : null}
                selectedHcoGrouping={
                  selectedFilters.accountGrouping.length > 0 ? selectedFilters.accountGrouping[0] : null
                }
                onStateSelect={(state, territories) => {
                  if (territories && territories.length > 0) {
                    // Update the hcoTerritory filter with selected territories
                    setSelectedFilters((prev) => ({
                      ...prev,
                      hcoTerritory: territories,
                    }))
                  } else if (state) {
                    // Handle single state selection if needed
                  }
                }}
              />
            </div>
          </div>
          <div className="w-full flex gap-4">
            <div className="flex w-[50%] bg-white rounded-xl border-b border-x border-gray-300">
              <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-full">
                <div className="flex gap-2 items-center p-2">
                  <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                    <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
                  </div>
                  <span className="text-gray-500 text-[11px] font-[500]">Top 10 HCPs by SMA Treated Patients Vol</span>
                </div>
                <table className="w-full text-sm text-left text-gray-700">
                  <thead>
                    <tr className="bg-blue-100 text-gray-600 uppercase text-[9px] font-bold">
                      <th className="py-2 px-2">Rank</th>
                      <th className="py-2 px-2">HCP ID</th>
                      <th className="py-2 px-2">HCP Name</th>
                      <th className="py-2 px-2">Speciality</th>
                      <th className="py-2 px-2">Zolgensma IV Target</th>
                      <th className="py-2 px-2">SMA Patients</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.top10HCPs.map((hcp, index) => (
                      <tr key={hcp.hcp_id} className="border-b border-gray-200 text-[9px] ">
                        <td className="py-1 px-2">{index + 1}</td>
                        <td 
                        onClick={() => getHCPDetails(hcp.hcp_name)} className="py-1 px-2 cursor-pointer">{hcp.hcp_id}</td>
                        <td 
                        onClick={() => getHCPDetails(hcp.hcp_name)} className="py-1 px-2 cursor-pointer">{hcp.hcp_name}</td>
                        <td className="py-1 px-2">{hcp.speciality}</td>
                        <td className="py-1 px-2">{hcp.zolgensma_iv_target}</td>
                        <td className="py-1 px-2">{hcp.patient_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex w-[50%] bg-white rounded-xl border-b border-x border-gray-300">
              <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-full">
                <div className="flex gap-2 items-center p-2">
                  <div className="bg-[#e74a21]/10 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                    <FaUserDoctor className="text-[#e74a21] h-[0.8rem] w-[0.8rem]" />
                  </div>
                  <span className="text-gray-500 text-[11px] font-[500]">Top 10 HCOs by SMA Treated Patients Vol</span>
                </div>
                <table className="w-full text-sm text-left text-gray-700">
                  <thead>
                    <tr className="bg-[#e74a21]/10 text-gray-600 uppercase text-[9px] font-bold">
                      <th className="py-2 px-2">Rank</th>
                      <th className="py-2 px-2">HCO MDM</th>
                      <th className="py-2 px-2">HCO MDM Name</th>
                      <th className="py-2 px-2">HCO GROUPING</th>
                      {/* <th className="py-2 px-2">HCO Archytype</th> */}
                      <th className="py-2 px-2">SMA Patients</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.top10HCOs.map((hco, index) => (
                      <tr key={hco.hco_mdm} className="border-b border-gray-200 text-[9px] ">
                        <td className="py-1 px-2">{index + 1}</td>
                        <td 
                        onClick={() => getHCODetails(hco.hco_mdm)} 
                        className="py-1 px-2 cursor-pointer">{hco.hco_mdm}</td>
                        <td 
                        onClick={() => getHCODetails(hco.hco_mdm)} 
                        className="py-1 px-2 cursor-pointer">{hco.hco_mdm_name}</td>
                        <td className="py-1 px-2">{hco.hco_grouping}</td>
                        {/* <td className="py-1 px-2"></td> */}
                        <td className="py-1 px-2">{hco.patient_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p>No data available.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default OverviewV2