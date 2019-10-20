module Main exposing (main)

import Element exposing (Element, el, row, column, padding, spacing, rgb255, htmlAttribute, newTabLink)
import Element.Background as Background
import Element.Border as Border
import Element.Font as Font
import Browser
import Browser.Dom as Dom
import Html exposing (Html, button, div, text)
import Html.Events.Extra.Pointer as Pointer
import String
import Tuple
import Html.Attributes exposing (style)
import Task
import Math.Vector2 exposing (Vec2, vec2, getX, getY)


type alias Model =
    { mousePos : Vec2
    , windowDim : Vec2
    }



initialModel : flags -> (Model, Cmd Msg)
initialModel flags =
    ( { mousePos = (vec2 0 0)
      , windowDim = (vec2 0 0)
      }
    , Task.attempt ViewportResponse Dom.getViewport
    )

originMousePos : Model -> Vec2
originMousePos model =
    let center = Math.Vector2.scale 0.5 model.windowDim in
    Math.Vector2.sub model.mousePos center
    

type Msg
    = MouseMove (Float, Float)
    | WindowResize
    | ViewportResponse (Result () Dom.Viewport)

subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch []

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
    case msg of
        WindowResize ->
            (model, Task.attempt ViewportResponse Dom.getViewport)
        MouseMove pos -> 
            ({model | mousePos = vec2 (Tuple.first pos) (Tuple.second pos)}, Cmd.none)
        ViewportResponse (Ok viewport) ->
            ({model | windowDim = (vec2 viewport.scene.width viewport.scene.height)}, Cmd.none)
        ViewportResponse (Err _) ->
            (model, Cmd.none)

view : Model -> Html Msg
view model =
    div [ style "backgroundColor" "black"
        , style "height" "100vh"
        , style "max-width" "100%"
        , Pointer.onMove (\event -> MouseMove event.pointer.pagePos)
        ]
        [ Element.layout []
              ( el [Element.centerY, Element.centerX]
                (card model)
              )
        ]

card : Model -> Element Msg
card model =
        let pos = originMousePos model in
        (row 
            [ 
              htmlAttribute <| style "perspective" "10px"
            , htmlAttribute <| style "transform-style" "preserve-3d"
            , htmlAttribute <| style "transform" 
                                              <| "rotateY("++String.fromFloat (getX pos / 10)++"deg)" 
                                              ++ "rotateX("++String.fromFloat -(getY pos / 10)++"deg)"
                                              ++ "translateZ(-100px)"
              
            ,  Font.color (rgb255 255 255 255)
            
            , Border.rounded 10
            , Border.width 2
            , Border.color (rgb255 255 255 255)
            -- , Element.width (Element.px 500)
            , padding 30, spacing 20]
            [ title
            , contacts
            ]
         )

title =
    el 
        [
          Font.size 34
        ] 
        (Element.text "Agrippa \nSpence \nKellum")

contacts =
    column
        []
        [
          contact "mailto:agrippakellum@gmail.com" "email"
        , contact "https://github.com/asktree" "github"
        , contact "https://twitter.com/about_agrippa" "twitter"
        , contact "https://www.linkedin.com/in/agrippa-k-ba59579a/" "linkedin"
        , contact "https://medium.com/@agrippakellum" "medium"
        ]

contact : String -> String -> Element msg
contact url words =
    el
        [ 
          Element.alignRight
        , Font.size 20
        ]
        (newTabLink []
            { url = url
            , label = Element.text words
            }
        )

main : Program () Model Msg
main =
    Browser.element
        { init = initialModel
        , view = view
        , update = update
        , subscriptions = subscriptions
        }