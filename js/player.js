var player;
var searchTypes_select = 'videos';
var selected_resolution = '1080p';
var selected_category = '';
var current_video = NaN;
var current_search = '';
var current_start_index = 1;
var current_prev_start_index = 1;
var current_page = 1;
var current_search_page = 1;
var current_song_page = 1;
var load_first_song_next = false;
var load_first_song_prev = false;
var current_song = NaN;
var next_vid;
var prev_vid;
var relTime;
var trackDuration;
var timeUpdater;
var previousLink;
var playFromHttp = false;
var playFromFile = false;
var playFromUpnp = false;
var playFromMega = false;
var playFromMegaUser = false;
var playFromTwitch = false;
var playFromYoutube = false;
var playFromDailymotionLive = false;
var doNotSwitch = false;
var currentMedia = {};

$(document).ready(function() {
	
	player = MediaElementPlayer('#videoPlayer', {
        features: ['playpause', 'progress', 'current', 'duration', 'tracks','stop', 'volume', 'fullscreen']
    });
    
    // next signal and callback
    $(document).on('click', '.mejs-next-btn', function(e) {
		e.preventDefault();
		play_next = true;
        getNext();
    });
    // stop button
    $(document).on('click', '#stopBtn, #subPlayer-stop', function(e) {
		try {
			upnpMediaPlaying = false;
			continueTransition = false;
			upnpContinuePlay = false;
			mediaRenderer.stop();
			stopUpnp();
		} catch(err) {}
        initPlayer();
        if (win.isFullscreen === true) {
            win.toggleFullscreen();
            player.isFullScreen = false;
        }
        $('#playerContainer').hide();
        $('#playerTopBar').hide();
        $('#tab a[href="#tabpage_'+activeTab+'"]').click();
        stopTorrent();
    });
    // pause/stop button
    $('.mejs-playpause-button').click(function(e) {
        if (playAirMedia === true) {
            if (airMediaPlaying === true) {
                login(stop_on_fbx);
                if (currentMedia.link !== currentAirMedia.link) {
                    setTimeout(function() {
                        $('.mejs-overlay-button').hide();
                        play_on_fbx(currentMedia.link);
                    }, 2000);
                }
            } else {
                $('.mejs-overlay-button').hide();
                play_on_fbx(currentMedia.link);
            }
        }
    });
    //transcoder button
     $(document).on('click','#transcodeBtnContainer,#transcodingBtnSub',function(e) {
		e.preventDefault();
		if(transcoderEnabled) {
			$('button[aria-controls="transcodeBtn"]').removeClass('transcoder-enabled').addClass('transcoder-disabled');
			$('button[aria-controls="transcodeBtn"]').attr('title',_('transcoding disabled'));
			$('#transcodingInput').prop( "checked", false );
			transcoderEnabled = false;
		} else {
			$('button[aria-controls="transcodeBtn"]').removeClass('transcoder-disabled').addClass('transcoder-enabled');
			$('button[aria-controls="transcodeBtn"]').attr('title',_('transcoding enabled'));
			$('#transcodingInput').prop( "checked", true );
			transcoderEnabled = true;
		}
	 });
    
    //playlist buttons
    $(document).on('click','#playlistBtn,#playlistBtnSub',function(e) {
		e.preventDefault();
		console.log('playlist clicked');
		var pos = $('button[aria-label="playlist"]').css('backgroundPosition-y');
		if(pos === '0px') {
			$('button[aria-label="playlist"]').attr('style', 'background-position-y:-16px !important');
			$('button[aria-label="playlist"]').attr('title',_('repeat mode'));
			playlistMode = 'loop';
		//} else if(pos === '-16px') {
			//$('button[aria-label="playlist"]').attr('style', 'background-position-y:-48px !important');
			//$('button[aria-label="playlist"]').attr('title','shuffle mode');
			//playlistMode = 'shuffle';
		} else if (pos === '-16px') {
			$('button[aria-label="playlist"]').attr('style', 'background-position-y:-48px !important');
			$('button[aria-label="playlist"]').attr('title',_('play and stop mode (click to change)'));
			playlistMode = 'normal';
		} else if (pos === '-48px') {
			$('button[aria-label="playlist"]').attr('style', 'background-position-y:0px !important');
			$('button[aria-label="playlist"]').attr('title',_('playlist mode'));
			playlistMode = 'continue';
		}
	});
	
    // previous signal and callback
    $(document).on('click', '.mejs-back-btn', function(e) {
        e.preventDefault();
        play_prev = true;
        getPrev();
    });
    
    // player signals
    player.media.addEventListener('ended', function() {
        updateMiniPlayer();
        on_media_finished();
		$('.mejs-overlay-play').show();
		$(".mejs-overlay-loading").hide();
    });
    
    player.media.addEventListener('pause', function() {
		$('#subPlayer-play').show();
		$('#subPlayer-pause').hide();
		updateMiniPlayer();
    });
    player.media.addEventListener('seeking', function() {
		$(".mejs-overlay-loading").show();
		$('.mejs-overlay-play').hide();
    });
    
    player.media.addEventListener('stalled', function() {
		$(".mejs-overlay-loading").show();
		$('.mejs-overlay-play').hide();
    });
    
    player.media.addEventListener('playing', function() {
		$('#subPlayer-play').hide();
		$('#subPlayer-pause').show();
		try { $('#fbxMsg2').remove(); } catch(err) {}
		$('.mejs-overlay-button,.mejs-overlay,.mejs-overlay-loading,.mejs-overlay-play').hide();
		updateMiniPlayer();
    });
    
	//SubPlayer controls
	$('#subPlayer-next').click(function() {
		play_next = true;
		getNext();
	});
	
	$('#subPlayer-play, #subPlayer-pause').click(function() {
		if(player.media.paused) {
			player.play();
		} else {
			player.pause();
		}
	});
	
	$('#subPlayer-prev').click(function() {
		play_prev = true;
		getPrev();
	});
	
	// subPlayer progress bar
	mediaPlayer = document.getElementById('videoPlayer');
	mediaPlayer.addEventListener('timeupdate', updateProgressBar, false);
	$('#progress-bar').click(function(e) {
		if(engine && engine.engine_name === 'Grooveshark' || playFromMegaUser || playFromMega) {
			return;
		}
		var pos = e.offsetX;
		var pct = (( pos * 100) / $('#progress-bar').width()).toFixed(2);
		var duree = player.media.duration !== Infinity ? player.media.duration : mediaDuration;
		console.log(pct + "%")
		var newTime = Math.round((duree * pct) / 100);
		if(transcoderEnabled || playFromYoutube) {
			var m = {};
			var l = currentMedia.link.replace(/&start=(.*)/,'')
			if(playFromFile) {
				m.link = l.replace('?file=/','?file=file:///')+'&start='+mejs.Utility.secondsToTimeCode(newTime);
			} else if(playFromHttp) {
				m.link = l.split('?file=')[1]+'&start='+mejs.Utility.secondsToTimeCode(newTime)+'&external';
			} else if (torrentPlaying) {
				m.link = l.split('?file=')[1]+'&start='+mejs.Utility.secondsToTimeCode(newTime)+'&torrent';
			} else if (playFromUpnp) {
				m.link = l.split('?file=')[1]+'&start='+mejs.Utility.secondsToTimeCode(newTime)+'&upnp';
			} else if (playFromYoutube) {
				doNotSwitch = true;
				m.link = l.split('?file=')[1]+'&start='+mejs.Utility.secondsToTimeCode(newTime);
			}
			m.title = currentMedia.title;
			startPlay(m);
		} else {
			player.setCurrentTime(newTime)
		}
	})
	
	// close player
	$('#closePlayer').click(function() {
		if (win.isFullscreen === true) {
            win.toggleFullscreen();
            player.isFullScreen = false;
        }
        $('#playerContainer').hide();
        $('#playerTopBar').hide();
        $('#tab a[href="#tabpage_'+activeTab+'"]').click();
    });
	
});


function initPlayer() {
	// clean subtitles
	try {
		$('.mejs-captions-button').remove();
		$('.mejs-captions-layer').remove();
		$('#videoPlayer').empty();
		player.tracks = [];
	} catch(err) {}
	// restore curosr if player is fulscreen
	if(win.isFullscreen) {$('body').css({'cursor':'default'});}
	//stop upnp
    if (upnpMediaPlaying || playFromUpnp) {
		try {
			mediaRenderer.stop();
		} catch(err) { }
	}
	//clean ffmpeg process
	try {
			cleanffar();
			currentRes.end();
		} catch (err) {}
	// stop torrents
	try {
		if(torrentPlaying) {
			stopTorrent();
		}
	} catch (err) {}
    // stop external players
	try {
		if(extPlayerRunning) {
			var pid = extPlayerProc.pid+1;
			psnode.kill(pid, function( err ) {
				if (err) {
					psnode.kill(extPlayerProc.pid, function( err ) {
						if (err) {
						    psnode.kill(pid+2, function( err ) {
								if (err) {
								    throw new Error('');
								}
								else {
								    console.log( 'Process %s has been killed!', pid );
								    extPlayerRunning = false;
								}
							});
						}
						else {
						    console.log( 'Process %s has been killed!', pid );
						    extPlayerRunning = false;
						}
					});
				}
				else {
				    console.log( 'Process %s has been killed!', pid );
				    extPlayerRunning = false;
				}
			});
		}
	} catch(err) {}
	// reinit internal player
    player.pause();
    player.setSrc('');
    player.currentTime = 0;
    player.durationD.text('00:00:00');
    player.currenttime.text('00:00:00')
    player.loaded.width(0);
    player.current.width(0);
    $('#infosPage').remove();
	$('#song-title').empty().append(_('Waiting...'));
	$('.mejs-container #fbxMsg').remove();
	$('#fbxMsg2').remove();
	$(".mejs-overlay-loading").hide();
	$(".mejs-overlay-button").show();
	$(".mejs-overlay-play").show();
	// reinit mini Player
	clearInterval(timeUpdater);
	timeUpdater = null;
	$("#subPlayer-title").text(' '+_('Waiting...'));
	$('#subPlayer-play').show();
	$('#subPlayer-pause').hide();
	$('#subPlayer-Progress progress').val(0);
	$('#subPlayer-Timer .mejs-duration,.mejs-currenttime').text('00:00:00')
	$('#subPlayer-img').attr('src','images/play-overlay.png');
}

function updateMiniPlayer() {
	var img = null;
	try {
		try {
			img = $('.highlight img')[0].src;
		}catch(err) {
			img = $('.list-row.well img')[0].src;
		}
		if (img && img !== $('#subPlayer-img').attr('src') && activeTab !== 3 && activeTab !== 5) {
			$('#subPlayer-img').attr('src',img);
		} else {
			$('#subPlayer-img').attr('src','images/play-overlay.png');
		}
	} catch(err) {
		$('#subPlayer-img').attr('src','images/play-overlay.png');
	}
}

function startPlay(media) {
	ffmpegLive = false;
	if(upnpMediaPlaying || playFromUpnp) {
		play_next = true;
	}
	updateMiniPlayer();
	if(currentMedia.link && playFromUpnp == false && upnpMediaPlaying == false) {
		if (media.link && media.link.indexOf('videoplayback?id') !== -1 && !upnpToggleOn) {
			if(!currentMedia.ytId || currentMedia.ytId !== ytId) {
				initPlayer();
			} else {
				cleanffar();
			}
		} else {
			if (player.media.currentSrc.indexOf(currentMedia.link) !== -1) {
				cleanffar();
			} else {
				if(!player.media.paused) {
					initPlayer();
				}
			}
		}
	}
    if(extPlayerRunning) {
		try {
			var pid = extPlayerProc.pid+1;
			psnode.kill(pid, function( err ) {
				if (err) {
					psnode.kill(extPlayerProc.pid, function( err ) {
						if (err) {
						    psnode.kill(pid+2, function( err ) {
								if (err) {
								    throw new Error('');
								}
								else {
								    console.log( 'Process %s has been killed!', pid );
								    extPlayerRunning = false;
								}
							});
						}
						else {
						    console.log( 'Process %s has been killed!', pid );
						    extPlayerRunning = false;
						}
					});
				}
				else {
				    console.log( 'Process %s has been killed!', pid );
				    extPlayerRunning = false;
				}
			});
			setTimeout(function() {
				startPlay(media);
				extPlayerRunning = false;
			},1000);
			return;
		} catch(err){};
	}
    
    playFromFile = false;
    playFromHttp = false;
    torrentPlaying = false;
    playFromUpnp = false;
    playFromMega = false;
    playFromMegaUser = false;
    playFromTwitch = false;
    playFromDailymotionLive = false;
    playFromYoutube = false;
    var localLink = null;
    try {
        next_vid = media.next;
        var link = media.link;
        if(link.indexOf('http://'+ipaddress+':8887/?file') !== -1) {
			link = link.split('?file=')[1].replace('&tv','');
		} else {
			link = link.replace('&tv','');
		}
		console.log(link)
        var title = media.title;
        currentMedia = media;
        currentMedia.link = link;
        
        // set title
        $('#song-title').empty().append(_('Playing: ') + decodeURIComponent(title));
		$('.mejs-overlay, .mejs-overlay-loading').show();
		$('.mejs-overlay-play').hide();
        // check type of link to play
		var linkType = link.split('&').pop();
		if (linkType === 'twitch' || link.indexOf('twitch.tv') !== -1) {
			playFromTwitch = true;
			currentMedia.link = link.replace('&twitch','').replace('&external','');
			launchPlay();
		// youtube dash
		} else if (link.indexOf('dailymotion.com') !== -1 && link.indexOf('&quality=') !== -1) {
			playFromDailymotionLive = true;
			currentMedia.link = link;
			launchPlay();
		} else if (link.indexOf('videoplayback?id') !== -1 && !upnpToggleOn) {
			playFromYoutube = true;
			currentMedia.link = link;
			currentMedia.ytId = ytId;
			launchPlay();
		} else if (linkType === 'torrent') {
			torrentPlaying = true;
			currentMedia.link = link.replace('&torrent','');
			launchPlay();
		// http(s) links
		} else if (linkType === 'external') {
			playFromHttp = true;
			currentMedia.link = link.replace('&external','');
			launchPlay();
		// local files links
		} else if (link.indexOf('file://') !== -1) {
			playFromFile = true;
			currentMedia.link = link.replace('file://','');
			try {
				var l = decodeURIComponent(link.replace('file://',''));
				var dir = path.dirname(l);
				var list = dirTree(dir);
				var i = 1;
				$('#videoPlayer').empty();
				Iterator.iterate(list.children).forEach(function (item,index) {
					var ext = path.extname(item.path);
					if(item.type == "file" && ext == ".srt" || ext == ".vtt") {
						fs.createReadStream(item.path).pipe(fs.createWriteStream(execDir+'/subtitles/'+_("Track")+i+ext));
						$('#videoPlayer').append('<track kind="subtitles" src="subtitles/'+_("Track")+i+ext+'" srclang="'+_("Track")+i+'" label="'+_("Track")+i+'" />');
						i+=1;
					}
				});
				player.findTracks();
				Iterator.iterate(player.tracks).forEach(function (item,index) { 
					player.loadTrack(index);
				});
				if($('.mejs-captions-button').length == 0 ) {
					setTimeout(function() {
						player.buildtracks(player,player.controls,player.layers,player.media)
						launchPlay();
					},1000);
				} else {
					setTimeout(function() {
						launchPlay();
					},1000);
				}
			} catch(err) {
				console.log(err)
				launchPlay();
			}
		// play from upnp server
		} else if (linkType === 'upnp' || upnpToggleOn) {
			playFromUpnp = true;
			currentMedia.link = link.replace('&upnp','');
			launchPlay();
		// else look for link already downloaded, if yes play it from hdd
		} else if (playFromFile == false) {
			if(currentMedia.link.match('http://|https://') !== null) {
				playFromHttp = true;
				launchPlay();
				return;
			}
			fs.readdir(download_dir, function(err, filenames) {
				var i;
				if (!filenames || filenames.length == 0 || err) {
					launchPlay();
				} else {
					for (i = 0; i < filenames.length; i++) {
						ftitle = filenames[i];
						if ((title + '.mp4' === ftitle) || (title + '.webm' === ftitle) || (title + '.mp3' === ftitle)) {
							currentMedia.link = 'file://' + encodeURI(download_dir + '/' + ftitle);
						}
						if (i+1 === filenames.length) {
							launchPlay();
						}
					}
				}
			});
		} else {
			launchPlay();
		}
    } catch (err) {
        console.log("error startPlay: " + err);
    }
}

function launchPlay() {
	try {
		var obj = JSON.parse(settings.ht5Player);
		if((activeTab == 1 || activeTab == 2) && (search_engine=== 'dailymotion' || search_engine=== 'youtube' || engine.type == "video") && obj.name === "StreamStudio") {
			if(doNotSwitch) {
				doNotSwitch = false;
			} else {
				$('#playerToggle').click();
				$(".mejs-overlay-button").hide();
				$('.mejs-overlay-play').hide();
			}
		}
	} catch(err) {}
	$('#subPlayer-play').hide();
	$('#subPlayer-pause').show();
	if($('#subPlayer-title').text() !== currentMedia.title) {
		$('#subPlayer-title').empty().append('<p>'+currentMedia.title+'</p>');
	}
	// transcoding by default
	if(transcoderEnabled && !upnpTranscoding || !upnpToggleOn && os.cpus().length > 2 || upnpToggleOn && upnpTranscoding) {
		transcoderEnabled = true;
	} else {
		transcoderEnabled = false;
	}

	// add link for transcoding
	if(currentMedia.link.indexOf('http://'+ipaddress+':8887/?file=') == -1 && transcoderEnabled || playFromTwitch || playFromDailymotionLive || playFromYoutube && obj.name === 'StreamStudio' || currentMedia.link.indexOf('mega.co') !== -1) {
		var link = 'http://'+ipaddress+':8887/?file='+currentMedia.link;
		currentMedia.link = link;
	}
	
	if(upnpToggleOn) {
		currentMedia.data = JSON.stringify({"protocolInfo" : "http-get:*"});
		if(currentMedia.type === undefined) {
			try {
				if (mime.lookup(currentMedia.title).indexOf('audio/') !== -1 || mime.lookup(currentMedia.link).indexOf('audio/') !== -1) {
					currentMedia.type = "object.item.audioItem.musicTrack";
				} else if (mime.lookup(currentMedia.title).indexOf('video/') !== -1 || mime.lookup(currentMedia.link).indexOf('video/') !== -1) {
					currentMedia.type = "object.item.videoItem";
				}
			} catch(err) {
				currentMedia.type = "object.item.videoItem";
			}
		}
		playUpnpRenderer(currentMedia);
		try {
			$('#items_container').scrollTop($('#items_container').scrollTop() + ('#items_container .well').position().top);
		} catch(err) {}
	} else {
		var obj = JSON.parse(settings.ht5Player);
		var link = currentMedia.link;
		if(obj.name === 'StreamStudio') {
			player.setSrc(currentMedia.link);
			player.play();
			if(player.tracks.length > 0) {
				$('input[value="'+_("Track").toLowerCase()+'1"]').attr('checked',true);
				player.setTrack(''+_("Track").toLowerCase()+'1');
			}
		} else {
			startExtPlayer(obj);
		}
		try {
			$('#items_container').scrollTop($('#items_container').scrollTop() + ('#items_container .well').position().top);
		} catch(err) {}
	}
}

function startExtPlayer(obj) {
	var link = decodeURIComponent(currentMedia.link).trim();
	var cpath = obj.path;
	if(process.platform === 'win32') {
		link = link.replace(' ', '\\ ');
		cpath = obj.path.replace(' ', '\\ ');
	}
	extPlayerProc = cp.exec("'"+cpath+"'"+' '+'"'+link+'"',{maxBuffer: 1024*1024*1024},function (error, stdout, stderr) {
	    console.log('stdout: ' + stdout);
	    console.log('stderr: ' + stderr);
	    if (error !== null) {
	      	console.log('exec error: ' + error);
	      	extPlayerRunning = false;
	    }
	});

	extPlayerRunning = true;
	extPlayerProc.on('exit',function() {
		console.log(obj.name + ' process terminated....');
		initPlayer();
		extPlayerRunning = false;
	});

}


function startVideo(vid_id, title) {
    if ($('#' + vid_id + ' a.video_link').length === 0) {
        return;
    }
    
    var childs = $('#' + vid_id + ' a.video_link');
    var elength = parseInt(childs.length);
    if (elength > 1) {
        for (var i = 0; i < elength; i++) {
            var found = false;
            var res = $(childs[i], this).attr('alt');
            if (res == settings.resolution) {
                childs[i].click();
                break;
            } else {
                // if not found  select the highest resolution available...
                if (i + 1 == elength) {
                    if (found === false) {
                        childs[0].click();
                    } else {
                        continue;
                    }
                }
            }
        }
    } else {
        childs[0].click();
    }
}

function playNextVideo(vid_id) {
    try {
        var elem_id = '';
        // if page was changed
        if (current_song_page !== current_page) {
            // if some items are loaded
            if ($('#items_container').children().length > 1) {
                // play first item
                vid_id = $('#items_container').find('.youtube_item').find('.downloads_container').attr('id');
            } else {
                return;
            }
        }
        load_first_song_next = false;
        load_first_song_prev = false;
        current_song_page = current_page;
        startVideo(vid_id);
    } catch (err) {
        console.log(err + " : can't play next video...");
    }
}

function getNext() {
    if (activeTab == 1) {
		try {
			engine.play_next();
		} catch(err) {
			try {
				$('.highlight').closest('li').next().find('a')[0].click();
			} catch (err) {
				try {
					$('.highlight').closest('li').next().find('a.preload')[0].click();
				} catch (err) {
					try {
						$('.highlight').closest('div.youtube_item').next().find('a.start_video').click()
					} catch (err) {
						playNextVideo(next_vid);
					}
				}
			}
		}
	} else {
		try {
			// have next node ? 
			if($('.jstree-clicked').closest('li').next('li').length > 0) {
				// we have another node, check if we have a folder or media
				if($('.jstree-clicked').closest('li').next('li').attr('id').indexOf('SubNode') == -1) {
					// media file, play it...
					$('.jstree-clicked').closest('li').next('li').find('a').click();
				} else {
					// have a dir, open it
					$('.jstree-clicked').closest('li').next('li').find('a').click();
					setTimeout(function(){
						getNext();
					},2000);
				}
			} else {
				//check if we are in a sub node
				while($('.jstree-clicked').closest('ul').parent().attr('id').indexOf('SubNode') !== -1){
					if($('.jstree-clicked').closest('ul').parent().closest('li').next('li').length > 0) {
						$('.jstree-clicked').closest('ul').parent().closest('li').next('li').find('a').first().click(); 
						setTimeout(function(){ 
							getNext();
						},2000);
						break;
					} else {
						console.log("no more videos to play in the playlists");
						break;
					}
				}
			}
		} catch(err) {} 
	}
}

function getPrev() {
    if (activeTab == 1) {
		try {
			$('.highlight').closest('li').prev().find('a')[0].click();
		} catch (err) {
			try {
				$('.highlight').closest('div.youtube_item').prev().find('a.start_video').click()
			} catch(err) {}
		}
	} else {
		try {
			// have next node ? 
			if($('.jstree-clicked').closest('li').prev('li').length > 0) {
				// we have another node, check if we have a folder or media
				if($('.jstree-clicked').closest('li').prev('li').attr('id').indexOf('SubNode') == -1) {
					// media file, play it...
					$('.jstree-clicked').closest('li').prev('li').find('a').click();
				} else {
					// have a dir, open it
					$('.jstree-clicked').closest('li').prev('li').find('a').click();
					setTimeout(function(){
						getprev();
					},2000);
				}
			} else {
				//check if we are in a sub node
				while($('.jstree-clicked').closest('ul').parent().attr('id').indexOf('SubNode') !== -1){
					if($('.jstree-clicked').closest('ul').parent().closest('li').prev('li').length > 0) {
						$('.jstree-clicked').closest('ul').parent().closest('li').prev('li').find('a').first().click(); 
						setTimeout(function(){ 
							getprev();
						},2000);
						break;
					} else {
						console.log("no more videos to play in the playlists");
						break;
					}
				}
			}
		} catch(err) {} 
	}
}

function on_media_finished(){
	if(win.isFullscreen) {$('body').css({'cursor':'default'});}
	if (playlistMode === 'normal') {
		initPlayer();
	} else if (playlistMode === 'loop') {
		if(upnpToggleOn) {
			if(upnpContinuePlay){
				playUpnpRenderer(currentMedia)
			}
		} else {
			startPlay(currentMedia);
		}
	} else if (playlistMode === 'shuffle') {
		
	} else if (playlistMode === 'continue') {
		if(upnpToggleOn) {
			if(upnpContinuePlay){
				getNext();
			}
		} else {
			getNext();
		}
	} 
}

function updateProgressBar() {
   var progressBar = document.getElementById('progress-bar');
   var duree = player.media.duration !== Infinity ? player.media.duration : mediaDuration;
   var current = player.media.currentTime;
   try {
	   var percentage = ((100 / duree) * current);
		progressBar.value = percentage;
	} catch(err) {}
}
