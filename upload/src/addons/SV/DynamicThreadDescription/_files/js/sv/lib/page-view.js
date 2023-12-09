var SV = window.SV || {};
SV.PageView = SV.PageView || {};

// noinspection JSUnusedLocalSymbols
(function($, window, document, _undefined)  {

    SV.PageView = (function()
    {
        var windowHistory = window.history,
            url = null,
            postUrl = null,
            mutationObserver = null,
            intersectionObserverInitPending = true,
            intersectionObserver = null,
            $container = null,
            watchedPostIds = {},
            pendingTimer = null,
            seenPendingPosts = [],
            pendingPostIds = [],
            watchSelector = null;

        function disable() {
            if (pendingTimer !== null) {
                clearTimeout(pendingTimer);
                pendingTimer = null;
            }
            if (mutationObserver !== null) {
                mutationObserver.disconnect();
                mutationObserver = null;
            }
            if (intersectionObserver !== null) {
                intersectionObserver.disconnect();
                intersectionObserverInitPending = true;
                intersectionObserver = null;
                watchedPostIds = {};
                seenPendingPosts = {};
                pendingPostIds = [];
            }
            $container = null;
        }

        function initialize() {
            if (!window.MutationObserver || !window.IntersectionObserver || !windowHistory || !windowHistory.replaceState)
            {
                return;
            }

            // Manipulate the URL to be suitable for sharing
            var urlObj = new URL(window.location.href);
            urlObj.hash = '';
            urlObj.searchParams.delete('post');
            url = urlObj.href;

            var urlMatch = url.match(/^(.*\/)(?:page-\d+)?(.*?)$/i);
            if (urlMatch && urlMatch[1]) {
                postUrl = urlMatch[1] + "post-";
            } else {
                postUrl = url + "post-";
            }

            $container = $('.js-replyNewMessageContainer');
            if ($container.length === 0) {
                console.log('Could not find messages container to watch');
                return;
            }

            var $firstPost = $container.children('article.js-post').first();
            var match = $firstPost.attr('id').match(/js-post-(\d+)/i);
            if (match && match[1]) {
                var postId = match[1] | 0;
                if ($firstPost.find('#post-footer-' + postId).length !== 0) {
                    watchSelector = '.message-attribution, .message-footer';
                }
            }
            if (watchSelector === null) {
                watchSelector = '.message-attribution';
            }

            SV.PageView.initWatchPosts();

            // https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
            mutationObserver = new MutationObserver(SV.PageView.observeChanges);
            mutationObserver.observe($container.get(0), {
                childList: true, // observe only direct children
            });

            $(window).on('resize', SV.PageView.initWatchPosts);
        }

        function observeChanges(mutationsList) {
            console.log(mutationsList); // console.log(the changes)
            for(const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    setTimeout(function()
                    {
                        SV.PageView.watchPosts();
                    }, 1)
                }
            }
        }

        function initWatchPosts() {
            if (intersectionObserver !== null) {
                intersectionObserver.disconnect();
                intersectionObserverInitPending = true;
                intersectionObserver = null;
                watchedPostIds = {};
                seenPendingPosts = [];
                pendingPostIds = [];
            }
            // https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
            // negative margins means the post needs to be mostly on screen
            var vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0),
                topMargin = -(vh *0.10) | 0,
                bottomMargin = -(vh *0.25) | 0;

            intersectionObserver = new IntersectionObserver(SV.PageView.watchPostVisibility, {
                root: null,
                rootMargin: topMargin + 'px 0px ' + bottomMargin+ 'px 0px',
                threshold: 1.0, // 1.0 == fully on screen
            });

            setTimeout(function()
            {
                SV.PageView.watchPosts();
            }, 0)
        }

        function watchPosts() {
            var
                postsWatched = 0,
                allWatches = {},
                oldWatches = watchedPostIds;
            $container.children('.js-post').each(function (i, e) {
                var $self = $(e),
                    id = '' + e.id;

                var match = id.match(/js-post-(\d+)/i);
                if (match && match[1]) {
                    var postId = match[1] | 0;
                    if (postId !== 0) {
                        var $observeTarget = $self.find(watchSelector);
                        if ($observeTarget.length === 0) {
                            return;
                        }
                        allWatches[postId] = postId;
                        if (!(postId in oldWatches)) {
                            postsWatched++;
                            $observeTarget.each(function(){
                                intersectionObserver.observe(this);
                            });
                        }
                    }
                }
            });
            watchedPostIds = allWatches;
        }

        function watchPostVisibility(entries) {
            if (intersectionObserverInitPending) {
                intersectionObserverInitPending = false;
                return;
            }

            // extract the post meta-data from the change records
            // collect into a list and then after the timer expires coalesce  updates
            entries.forEach(entry => {
                if (entry.isVisible || entry.isIntersecting) {
                    var $target = $(entry.target),
                        id = $target.closest('article.js-post').attr('id');
                    var match = id ? id.match(/post-(\d+)/i) : '';
                    if (match && match[1]) {
                        var isHeader = $target.hasClass('message-attribution');
                        var postId = match[1] | 0;

                        if (!(postId in seenPendingPosts)) {
                            pendingPostIds.push(postId);
                            seenPendingPosts[postId] = {postId: postId, isHeader: isHeader, target: $target};
                        }
                        else if (isHeader) {
                            seenPendingPosts[postId] = {postId: postId, isHeader: isHeader, target: $target};
                        }
                    }
                }
            });

            if (pendingTimer !== null) {
                clearTimeout(pendingTimer);
                pendingTimer = null;
            }

            pendingTimer = setTimeout(function()
            {
                pendingTimer = null;
                SV.PageView.resolvePendingUrlUpdate();
            }, 100);
        }

        function resolvePendingUrlUpdate() {
            if (pendingPostIds.length === 0) {
                return;
            }

            var postId = pendingPostIds[pendingPostIds.length - 1],
                post = seenPendingPosts[postId];

            seenPendingPosts = {};
            pendingPostIds = [];

            SV.PageView.doPendingUrlUpdate(post);
        }

        function doPendingUrlUpdate(post) {
            if (!post.postId || !post.target) {
                return;
            }
            var postId = post.postId,
                isHeader = post.isHeader,
                $target = post.target,
                $parent = $target.closest('article.js-post');
            if (isHeader) {
                // entering post
                var $prevPost = $parent.prev();
                if ($prevPost.length === 0) {
                    // no more posts
                    windowHistory.replaceState(null,null, url);
                    return;
                }
            } else {
                // possibly exiting the post
                var $nextPost = $parent.next();
                if ($nextPost.length === 0) {
                    // no more posts
                    windowHistory.replaceState(null,null, url + '#js-quickReply');
                    return;
                }
            }

            //console.log('Entering post:' + pendingPostId)
            windowHistory.replaceState(null,null, postUrl + postId);
        }

        return {
            initialize: initialize,
            disable: disable,
            observeChanges: observeChanges,
            initWatchPosts: initWatchPosts,
            watchPosts: watchPosts,
            watchPostVisibility: watchPostVisibility,
            resolvePendingUrlUpdate: resolvePendingUrlUpdate,
            doPendingUrlUpdate: doPendingUrlUpdate,
        };
    })();

    $(document).on('xf:page-load-complete', function() {
        SV.PageView.initialize();
    });
}) (jQuery, window, document);