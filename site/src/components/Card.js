import React from "react"

import "./Card.css"

export default function Card(props) {
  
  return (
    <div
      className={"card"}
    >
      <div
        style={{
          float: "right",
          textAlign: "right",
          margin: 0,
          fontSize: "20px",
          lineHeight: "24px"
        }}
        className={"cardContent"}
      >
        <a href="mailto:agrippakellum@gmail.com">email</a>
        <br />
        <a href="https://github.com/asktree">github</a>
        <br />
        <a href="https://twitter.com/about_agrippa">twitter</a>
        <br />
        <a href="https://www.linkedin.com/in/agrippa-k-ba59579a/">linkedin</a>
        <br />
        <a href="https://medium.com/@agrippakellum">medium</a>
      </div>
      <div
        style={{
          margin:0,
          fontSize: "36px",
          lineHeight: "40px"
        }}
        className={"cardName"}
      >
        Agrippa
        <br />
        Spence
        <br />
        Kellum
      </div>
    </div>
  )
}
