// youtube player code based on Ximera youtube player
// https://github.com/XimeraProject/server
// https://github.com/XimeraProject/server/blob/master/public/javascripts/youtube.js

import React, { useRef, useEffect } from "react";
import useDoenetRenderer from "../useDoenetRenderer";
import { sizeToCSS } from "./utils/css";
import VisibilitySensor from "react-visibility-sensor-v2";
import styled from "styled-components";
const VideoStyling = styled.div`
  &: focus {
    outline: 2px solid var(--canvastext);
    outline-offset: 2px;
  }
`;

export default React.memo(function Video(props) {
  let { name, id, SVs, actions, callAction } = useDoenetRenderer(props);

  let player = useRef(null);
  let postSkipTime = useRef(null);
  let preSkipTime = useRef(null);
  let rates = useRef([]);
  let lastPlayerState = useRef(null);
  let pauseTimeoutId = useRef(null);
  let lastPausedTime = useRef(0);
  let lastPlayedTime = useRef(null);
  let pollIntervalId = useRef(null);
  let lastSetTimeAction = useRef(null);

  let onChangeVisibility = (isVisible) => {
    callAction({
      action: actions.recordVisibilityChange,
      args: { isVisible },
    });
  };

  useEffect(() => {
    return () => {
      callAction({
        action: actions.recordVisibilityChange,
        args: { isVisible: false },
      });
    };
  }, []);

  useEffect(() => {
    if (SVs.youtube) {
      let cName = id;

      // protect against window.YT being undefined,
      // which could occur if cannot reach youtube
      if (window.YT) {
        player.current = new window.YT.Player(cName, {
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
          },
          events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
            onPlaybackRateChange: onPlaybackRateChange,
          },
        });
      }
    }
  }, [window.YT]);

  function pollCurrentTime() {
    let currentTime = player.current.getCurrentTime();
    let timeInterval;

    // if previously skipped a time (because the jump was too large)
    // we need to calculate the interval from that skipped time
    if (postSkipTime.current) {
      timeInterval = currentTime - postSkipTime.current;
    } else {
      timeInterval = currentTime - preSkipTime.current;
    }

    // We are polling every 200 ms,
    // hence if a jump was larger than a second (or negative),
    // we guess that a portion of the video was skipped
    // so don't update the current time for one cycle
    // (which is typically long enough for the state change listener
    // to be able to grab the current time to determine
    // the end of the watched segment)
    if (!(preSkipTime.current >= 0) || (timeInterval > 0 && timeInterval < 1)) {
      preSkipTime.current = currentTime;
      postSkipTime.current = null;
    } else if (timeInterval !== 0) {
      // jump was negative or longer than a second
      postSkipTime.current = currentTime;
    }

    let roundTime = Math.floor(currentTime);
    if (roundTime !== lastSetTimeAction.current) {
      lastSetTimeAction.current = roundTime;
      callAction({
        action: actions.setTime,
        args: {
          time: roundTime,
        },
      });
    }
  }

  function onPlayerReady(event) {
    //setPlaybackQuality doesn't seem to work
    // event.target.setPlaybackQuality("hd720");
    // player.current.setPlaybackQuality("hd720");

    callAction({
      action: actions.recordVideoReady,
      args: {
        duration: player.current.getDuration(),
      },
    });
  }

  function onPlayerStateChange(event) {
    //setPlaybackQuality doesn't seem to work
    // if (event.data == YT.PlayerState.BUFFERING) {
    // event.target.setPlaybackQuality('hd720');
    //     event.target.setPlaybackQuality('hd1080');
    // }

    let duration = player.current.getDuration();

    switch (event.data) {
      case window.YT.PlayerState.PLAYING:
        if (lastPlayerState.current !== event.data) {
          let currentTime = player.current.getCurrentTime();

          // To correctly capture the "watched" events, we need to know the last time
          // of the player before the user skips to a new spot
          // Since the callbacks only give the time after a skip,
          // we poll the player for the pre-skip time every 200 ms
          // to record the last time before a skip

          clearInterval(pollIntervalId.current);
          pollIntervalId.current = window.setInterval(pollCurrentTime, 200);

          if (lastPlayerState.current === window.YT.PlayerState.PAUSED) {
            let timeSincePaused = currentTime - lastPausedTime.current;

            // if the time has gone backward or move ahead more than a half-second,
            // we consider that a portion of the video was skipped
            // (When video is paused and immediately restarted, the time
            // skips forward a small amount, but less than a half-second)

            if (timeSincePaused < 0 || timeSincePaused > 0.5) {
              //  console.log("recordVideoSkipped",{
              //     beginTime: lastPausedTime.current,
              //     endTime: currentTime,
              //     duration,
              //   })

              callAction({
                action: actions.recordVideoSkipped,
                args: {
                  beginTime: lastPausedTime.current,
                  endTime: currentTime,
                  duration,
                },
              });
            }
          }

          // lastPausedTime.current = currentTime;
          let rate = player.current.getPlaybackRate();
          rates.current = [
            {
              startingPoint: currentTime,
              rate,
            },
          ];

          lastPlayedTime.current = currentTime;
          preSkipTime.current = currentTime;
          postSkipTime.current = null;

          // console.log("recordVideoStarted",{
          //     beginTime: player.current.getCurrentTime(),
          //     duration,
          //     rate,
          //   })
          callAction({
            action: actions.recordVideoStarted,
            args: {
              beginTime: player.current.getCurrentTime(),
              duration,
              rate,
            },
          });

          lastPlayerState.current = event.data;
        }

        break;

      case window.YT.PlayerState.PAUSED:
        // When a user pauses a video, we emit two events:
        // a watched event summarizing that segment of watching
        // and a paused event.
        // However, when a users skips to a new point without pausing,
        // the player emits the state change sequence: PAUSED, BUFFERING, PLAYING
        // To prevent the pause event, we wait 250 millisecond.
        // If a BUFFERING event occurs, we only emit the watched event, not the paused event

        let lastState = lastPlayerState.current;
        let beginTime = lastPlayedTime.current;
        let pausedTime = player.current.getCurrentTime();

        pauseTimeoutId.current = setTimeout(function () {
          clearInterval(pollIntervalId.current);

          if (
            lastState === window.YT.PlayerState.PLAYING &&
            pausedTime > beginTime
          ) {
            rates.current[rates.current.length - 1].endingPoint = pausedTime;

            // console.log("recordVideoWatched from PAUSED", {
            //   beginTime,
            //   endTime: pausedTime,
            //   duration,
            //   rates: rates.current,
            // })
            callAction({
              action: actions.recordVideoWatched,
              args: {
                beginTime,
                endTime: pausedTime,
                duration,
                rates: rates.current,
              },
            });

            // make last played time as null so that, if we getting a buffering state change,
            // we know not to record another watched event
            lastPlayedTime.current = null;
          }
          // console.log("recordVideoPaused",{
          //   endTime: pausedTime,
          //   duration,
          // })
          callAction({
            action: actions.recordVideoPaused,
            args: {
              endTime: pausedTime,
              duration,
            },
          });

          lastPausedTime.current = pausedTime;
          lastPlayerState.current = event.data;
        }, 250);

        break;

      case window.YT.PlayerState.BUFFERING:
        clearTimeout(pauseTimeoutId.current);
        let currentTime = player.current.getCurrentTime();

        if (lastPlayedTime.current !== null) {
          let beginTime = lastPlayedTime.current;

          if (preSkipTime.current > beginTime) {
            rates.current[rates.current.length - 1].endingPoint =
              preSkipTime.current;

            // console.log("BUFFERING recordVideoWatched", {
            //   beginTime,
            //   endTime: preSkipTime.current,
            //   duration,
            //   rates: rates.current,
            // })

            callAction({
              action: actions.recordVideoWatched,
              args: {
                beginTime,
                endTime: preSkipTime.current,
                duration,
                rates: rates.current,
              },
            });

            beginTime = preSkipTime.current;
          }

          // console.log("BUFFERING recordVideoSkipped", {
          //   beginTime,
          //   endTime: currentTime,
          //   duration,
          // })

          callAction({
            action: actions.recordVideoSkipped,
            args: {
              beginTime,
              endTime: currentTime,
              duration,
            },
          });

          lastPlayerState.current = event.data;
          lastPlayedTime.current = null;
          preSkipTime.current = currentTime;
          postSkipTime.current = null;
        }

        break;

      case window.YT.PlayerState.ENDED:
        // BADBAD: We're treating ENDED as though it meant the user
        // completed the video, even thought it
        // doesn't necessarily mean the learner watched ALL the video

        clearInterval(pollIntervalId.current);

        // if rates.current is empty, then never played
        let begin = lastPlayedTime.current;
        let end = player.current.getCurrentTime();
        if (rates.current.length > 0 && begin !== null && end > begin) {
          rates.current[rates.current.length - 1].endingPoint = end;

          // console.log("recordVideoWatched from ENDED", {
          //   beginTime: begin,
          //   endTime: end,
          //   duration,
          //   rates: rates.current,
          // })
          callAction({
            action: actions.recordVideoWatched,
            args: {
              beginTime: begin,
              endTime: end,
              duration,
              rates: rates.current,
            },
          });

          lastPlayedTime.current = null;
        }

        // console.log("recordVideoCompleted",{
        //   duration,
        // })
        callAction({
          action: actions.recordVideoCompleted,
          args: {
            duration,
          },
        });

        lastPlayerState.current = event.data;

        break;

      case window.YT.PlayerState.UNSTARTED:
        lastPlayerState.current = event.data;

        break;
    }
  }

  function onPlaybackRateChange(event) {
    let currentTime = player.current.getCurrentTime();

    rates.current[rates.current.length - 1].endingPoint = currentTime;
    rates.current.push({
      startingPoint: currentTime,
      rate: event.data,
    });
  }

  if (player.current?.getPlayerState) {
    let playerState = player.current.getPlayerState();
    if (SVs.state === "playing") {
      if (
        playerState === window.YT.PlayerState.UNSTARTED ||
        playerState === window.YT.PlayerState.PAUSED ||
        playerState === window.YT.PlayerState.CUED ||
        playerState === window.YT.PlayerState.ENDED
      ) {
        player.current.playVideo();
      }
    } else if (SVs.state === "stopped") {
      if (playerState === window.YT.PlayerState.PLAYING) {
        player.current.pauseVideo();
      }
    }

    if (SVs.time !== Number(lastSetTimeAction.current)) {
      let time = SVs.time;
      let duration = player.current.getDuration();

      if (duration > 0 && time > duration) {
        time = Math.floor(duration);
        callAction({
          action: actions.setTime,
          args: {
            time,
          },
        });
      }
      if (time !== Number(lastSetTimeAction.current)) {
        if (player.current.getPlayerState() === window.YT.PlayerState.CUED) {
          // Seeking a cued player drops it to UNSTARTED: a black frame with
          // no poster and no controls.  Cue it at the offset instead.
          player.current.cueVideoById({
            videoId: SVs.youtube,
            startSeconds: time,
          });
        } else {
          player.current.seekTo(time, true);
        }

        lastSetTimeAction.current = time;
      }
    }
  }

  if (SVs.hidden) return null;

  let outerStyle = {};

  if (SVs.displayMode === "inline") {
    outerStyle = {
      display: "inline-block",
      verticalAlign: "middle",
      margin: "12px 0",
    };
  } else {
    outerStyle = {
      display: "flex",
      justifyContent: SVs.horizontalAlign,
      margin: "12px 0",
    };
  }

  let videoStyle = {
    maxWidth: "100%",
    width: sizeToCSS(SVs.width),
    aspectRatio: String(SVs.aspectRatio),
  };

  let videoTag;

  if (SVs.youtube) {
    videoTag = (
      <iframe
        id={id}
        style={videoStyle}
        src={
          "https://www.youtube.com/embed/" +
          SVs.youtube +
          "?enablejsapi=1&rel=0&modestbranding=1"
        }
        allow="autoplay; fullscreen"
      />
    );
  } else if (SVs.source) {
    videoTag = (
      <video className="video" id={id} controls style={videoStyle}>
        <source
          src={SVs.source}
          type={`video/${SVs.source.split("/").pop().split(".").pop()}`}
        />
        Your browser does not support the &lt;video&gt; tag.
      </video>
    );
  } else {
    videoTag = <span id={id}></span>;
  }

  return (
    <VisibilitySensor partialVisibility={true} onChange={onChangeVisibility}>
      <VideoStyling tabIndex="0" style={outerStyle} id={id + "_outer"}>
        <a name={id} />
        {videoTag}
      </VideoStyling>
    </VisibilitySensor>
  );
});
