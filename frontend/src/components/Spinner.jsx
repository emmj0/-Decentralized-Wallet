import React from 'react'

export default function Spinner({size=6}){
  const cls = `animate-spin inline-block w-${size} h-${size} border-4 border-t-transparent rounded-full`
  // Tailwind classes using template strings won't work for dynamic sizes in compiled CSS,
  // but we will provide fixed classes via inline style for reliability.
  const s = (size*4) + 'px'
  return (
    <div style={{width:s,height:s,border:'4px solid rgba(0,0,0,0.1)',borderTopColor:'#06B6D4',borderRadius:'50%'}} className="inline-block animate-spin" />
  )
}
