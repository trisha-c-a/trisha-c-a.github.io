(function () {
  var root = document.documentElement;
  var themeToggle = document.getElementById("themeToggle");
  var mobileMenuToggle = document.getElementById("mobileMenuToggle");
  var topNav = document.getElementById("primaryNav");
  var hobbiesToggle = document.getElementById("hobbiesToggle");
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".top-nav a"));
  var sections = Array.prototype.slice.call(document.querySelectorAll("main section[id]"));
  var mobileNavQuery = window.matchMedia("(max-width: 759px)");


  function getCurrentTheme() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function applyThemeUI(theme) {
    if (!themeToggle) {
      return;
    }

    var isLight = theme === "light";
    themeToggle.setAttribute("aria-pressed", String(isLight));
    themeToggle.setAttribute("data-state", isLight ? "on" : "off");
    themeToggle.setAttribute("aria-label", isLight ? "Switch to dark mode" : "Switch to light mode");
  }

  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    applyThemeUI(theme);

    try {
      localStorage.setItem("theme", theme);
    } catch {
    }
  }

  function markActiveLink() {
    var activeId = "";
    var viewportMiddle = window.scrollY + window.innerHeight * 0.35;

    for (var i = 0; i < sections.length; i += 1) {
      var section = sections[i];
      if (viewportMiddle >= section.offsetTop) {
        activeId = section.id;
      }
    }

    navLinks.forEach(function (link) {
      var isActive = link.getAttribute("href") === "#" + activeId;
      link.classList.toggle("is-active", isActive);
    });

    if (hobbiesToggle) {
      var hobbiesIsActive = activeId === "hobbies" || activeId === "reading";
      hobbiesToggle.classList.toggle("is-active", hobbiesIsActive);
    }
  }

  function setMobileMenuState(isOpen) {
    if (!mobileMenuToggle || !topNav) {
      return;
    }

    mobileMenuToggle.setAttribute("aria-expanded", String(isOpen));
    mobileMenuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    topNav.classList.toggle("is-open", isOpen);
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var nextTheme = getCurrentTheme() === "dark" ? "light" : "dark";
      setTheme(nextTheme);
    });
  }

  if (mobileMenuToggle && topNav) {
    mobileMenuToggle.addEventListener("click", function () {
      var isOpen = mobileMenuToggle.getAttribute("aria-expanded") === "true";
      setMobileMenuState(!isOpen);
    });

    navLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        if (mobileNavQuery.matches) {
          setMobileMenuState(false);
        }
      });
    });

    window.addEventListener("resize", function () {
      if (!mobileNavQuery.matches) {
        setMobileMenuState(false);
      }
    });

    setMobileMenuState(false);
  }

  applyThemeUI(getCurrentTheme());
  markActiveLink();
  window.addEventListener("scroll", markActiveLink, { passive: true });

  // Experience tab switching
  var expTabs = Array.prototype.slice.call(document.querySelectorAll(".exp-company-btn"));
  var expPanels = Array.prototype.slice.call(document.querySelectorAll(".exp-panel"));
  var expMobileSlider = document.getElementById("expMobileSlider");
  var expMobileCompanyLabel = document.getElementById("expMobileCompanyLabel");
  var currentExpIndex = 0;
  var projectsCarousel = document.querySelector("[data-projects-carousel]");
  var projectsTrack = projectsCarousel ? projectsCarousel.querySelector(".projects-track") : null;
  var projectsPrevButton = projectsCarousel ? projectsCarousel.querySelector("[data-projects-prev]") : null;
  var projectsNextButton = projectsCarousel ? projectsCarousel.querySelector("[data-projects-next]") : null;
  var projectRotationTimer = null;
  var projectIsAnimating = false;
  var projectTransitionFallbackTimer = null;
  var PROJECT_ROTATION_DELAY = 4500;
  function switchExpTab(index) {
    currentExpIndex = index;

    expTabs.forEach(function (tab, i) {
      var active = i === index;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    expPanels.forEach(function (panel, i) {
      if (i === index) {
        panel.removeAttribute("hidden");
      } else {
        panel.setAttribute("hidden", "");
      }
    });

    if (expMobileCompanyLabel && expTabs[index]) {
      expMobileCompanyLabel.textContent = expTabs[index].textContent.trim();
    }

    if (expMobileSlider) {
      expMobileSlider.value = index;

      var segmentSize = 100 / Math.max(expTabs.length, 1);
      var segmentStart = index * segmentSize;
      var segmentEnd = segmentStart + segmentSize;

      expMobileSlider.style.setProperty("--exp-segment-start", segmentStart + "%");
      expMobileSlider.style.setProperty("--exp-segment-end", segmentEnd + "%");
    }
  }

  expTabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () {
      switchExpTab(i);
    });

    tab.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        var next = (i + 1) % expTabs.length;
        switchExpTab(next);
        expTabs[next].focus();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        var prev = (i - 1 + expTabs.length) % expTabs.length;
        switchExpTab(prev);
        expTabs[prev].focus();
      }
    });
  });

  if (expMobileSlider && expTabs.length > 0) {
    expMobileSlider.min = "0";
    expMobileSlider.max = String(expTabs.length - 1);

    expMobileSlider.addEventListener("input", function () {
      var index = parseInt(expMobileSlider.value, 10);
      switchExpTab(index);
    });
  }

  if (expTabs.length > 0) {
    var initialExpIndex = 0;

    for (var idx = 0; idx < expTabs.length; idx += 1) {
      if (expTabs[idx].classList.contains("is-active")) {
        initialExpIndex = idx;
        break;
      }
    }

    switchExpTab(initialExpIndex);
  }

  function getVisibleProjectCount() {
    if (window.matchMedia("(max-width: 600px)").matches) {
      return 1;
    }

    if (window.matchMedia("(max-width: 900px)").matches) {
      return 2;
    }

    return 3;
  }

  function getProjectCards() {
    if (!projectsTrack) {
      return [];
    }

    return Array.prototype.slice.call(projectsTrack.querySelectorAll(".project-card"));
  }

  function getProjectStepWidth() {
    var firstCard = projectsTrack ? projectsTrack.querySelector(".project-card") : null;
    if (!firstCard) {
      return 0;
    }

    var trackStyles = window.getComputedStyle(projectsTrack);
    var gapValue = trackStyles.columnGap || trackStyles.gap || "0";
    var gap = parseFloat(gapValue) || 0;

    return firstCard.getBoundingClientRect().width + gap;
  }

  function stopProjectRotation() {
    if (projectRotationTimer) {
      window.clearInterval(projectRotationTimer);
      projectRotationTimer = null;
    }
  }

  function syncProjectControls() {
    var canRotate = getProjectCards().length > getVisibleProjectCount();

    if (projectsPrevButton) {
      projectsPrevButton.disabled = !canRotate;
    }

    if (projectsNextButton) {
      projectsNextButton.disabled = !canRotate;
    }

    return canRotate;
  }

  function rotateProjects(direction) {
    var cards = getProjectCards();
    var stepWidth = getProjectStepWidth();

    if (!projectsTrack || projectIsAnimating || cards.length <= getVisibleProjectCount() || !stepWidth) {
      return;
    }

    projectIsAnimating = true;

    function completeRotation(onComplete) {
      var done = false;

      function finish() {
        if (done) {
          return;
        }

        done = true;
        if (projectTransitionFallbackTimer) {
          window.clearTimeout(projectTransitionFallbackTimer);
          projectTransitionFallbackTimer = null;
        }

        onComplete();
        projectIsAnimating = false;
      }

      projectsTrack.addEventListener("transitionend", function handleTransition(event) {
        if (event.target !== projectsTrack) {
          return;
        }

        finish();
      }, { once: true });

      projectTransitionFallbackTimer = window.setTimeout(finish, 700);
    }

    if (direction === "prev") {
      var lastCard = cards[cards.length - 1];

      projectsTrack.style.transition = "none";
      projectsTrack.insertBefore(lastCard, cards[0]);
      projectsTrack.style.transform = "translateX(" + (-stepWidth) + "px)";
      void projectsTrack.offsetWidth;
      projectsTrack.style.transition = "";

      completeRotation(function () {});

      projectsTrack.style.transform = "translateX(0)";
      return;
    }

    completeRotation(function () {
      projectsTrack.appendChild(cards[0]);
      projectsTrack.style.transition = "none";
      projectsTrack.style.transform = "translateX(0)";
      void projectsTrack.offsetWidth;
      projectsTrack.style.transition = "";
    });

    projectsTrack.style.transform = "translateX(" + (-stepWidth) + "px)";
  }

  function restartProjectRotation() {
    stopProjectRotation();

    if (!syncProjectControls()) {
      return;
    }

    projectRotationTimer = window.setInterval(function () {
      rotateProjects("next");
    }, PROJECT_ROTATION_DELAY);
  }

  if (projectsPrevButton && projectsNextButton) {
    projectsPrevButton.addEventListener("click", function () {
      rotateProjects("prev");
      restartProjectRotation();
    });

    projectsNextButton.addEventListener("click", function () {
      rotateProjects("next");
      restartProjectRotation();
    });

    window.addEventListener("resize", function () {
      if (projectsTrack) {
        projectsTrack.style.transition = "none";
        projectsTrack.style.transform = "translateX(0)";
        void projectsTrack.offsetWidth;
        projectsTrack.style.transition = "";
      }

      restartProjectRotation();
    });

    projectsTrack.addEventListener("mouseover", function (event) {
      if (event.target.closest(".project-card")) {
        stopProjectRotation();
      }
    });

    projectsTrack.addEventListener("mouseout", function (event) {
      var fromCard = event.target.closest(".project-card");
      var toCard = event.relatedTarget && event.relatedTarget.closest
        ? event.relatedTarget.closest(".project-card")
        : null;

      if (fromCard && !toCard) {
        restartProjectRotation();
      }
    });

    restartProjectRotation();
  }

  // Reading analytics
  var readingYearFilter = document.getElementById("readingYearFilter");
  var booksPerYearChart = document.getElementById("booksPerYearChart");
  var genreWordCloud = document.getElementById("genreWordCloud");
  var readingFallbackGrid = document.getElementById("readingFallbackGrid");
  var readingFallbackRow = document.getElementById("readingFallbackRow");
  var readingState = {
    selectedYear: "all",
    data: null
  };

  function getFavoriteBooks() {
    return [
      {
        title: "I Contain Multitudes",
        coverUrl: "https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1445606162i/27213168.jpg"
      },
      {
        title: "The Last Lecture",
        coverUrl: "https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1529682044i/40611510.jpg"
      },
      {
        title: "Thinking, Fast and Slow",
        coverUrl: "https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1317793965i/11468377.jpg"
      },
      {
        title: "A Thousand Splendid Suns",
        coverUrl: "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1660258212l/4906099.jpg"
      },
      {
        title: "Pachinko",
        coverUrl: "https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1766879949i/34051011.jpg"
      }
    ];
  }

  function renderFavoriteBooksShelf(books) {
    if (!readingFallbackGrid || !readingFallbackRow) {
      return;
    }

    var cardMarkup = books.map(function (book) {
      return [
        '<article class="reading-card">',
        '<img class="reading-cover" src="' + book.coverUrl + '" alt="Cover of ' + book.title + '" loading="lazy" />',
        "</article>"
      ].join("");
    }).join("");

    readingFallbackRow.innerHTML = cardMarkup;
    readingFallbackGrid.hidden = false;
  }

  function sortYearEntries(yearBreakdown) {
    return Object.keys(yearBreakdown || {})
      .map(function (year) {
        return {
          year: year,
          count: Number(yearBreakdown[year]) || 0
        };
      })
      .filter(function (entry) {
        return entry.count > 0;
      })
      .sort(function (a, b) {
        return Number(a.year) - Number(b.year);
      });
  }

  function populateYearFilter(yearEntries) {
    if (!readingYearFilter) {
      return;
    }

    var options = ['<option value="all">All years</option>'];
    var descending = yearEntries.slice().sort(function (a, b) {
      return Number(b.year) - Number(a.year);
    });

    descending.forEach(function (entry) {
      options.push('<option value="' + entry.year + '">' + entry.year + "</option>");
    });

    readingYearFilter.innerHTML = options.join("");
  }

  function getYearBreakdownFromData(data) {
    var breakdown = data && data.stats && data.stats.yearBreakdown ? data.stats.yearBreakdown : {};

    if (Object.keys(breakdown).length) {
      return breakdown;
    }

    var fallbackBreakdown = {};
    (data.books || []).forEach(function (book) {
      var year = book.yearRead || (book.dateRead ? new Date(book.dateRead).getUTCFullYear() : null);
      if (!year || Number.isNaN(Number(year))) {
        return;
      }

      var yearKey = String(year);
      fallbackBreakdown[yearKey] = (fallbackBreakdown[yearKey] || 0) + 1;
    });

    return fallbackBreakdown;
  }

  function getAllYearEntriesFromData(data) {
    return sortYearEntries(getYearBreakdownFromData(data));
  }

  function getYearEntriesForSelection(data) {
    var allEntries = getAllYearEntriesFromData(data);

    if (readingState.selectedYear === "all") {
      return allEntries;
    }

    var selectedYear = String(readingState.selectedYear);
    return allEntries.filter(function (entry) {
      return String(entry.year) === selectedYear;
    });
  }

  function renderBooksPerYearChart(yearEntries) {
    if (!booksPerYearChart) {
      return;
    }

    if (!yearEntries.length) {
      booksPerYearChart.classList.add("empty");
      booksPerYearChart.textContent = "No yearly reading data available yet.";
      return;
    }

    booksPerYearChart.classList.remove("empty");
    var maxCount = Math.max.apply(null, yearEntries.map(function (entry) {
      return entry.count;
    }));

    var markup = yearEntries.map(function (entry) {
      var ratio = maxCount > 0 ? entry.count / maxCount : 0;
      var barHeight = 18 + Math.round(ratio * 140);
      return [
        '<div class="year-bar-item">',
        '<span class="year-bar-count">' + entry.count + "</span>",
        '<div class="year-bar" style="height:' + barHeight + 'px"></div>',
        '<span class="year-bar-label">' + entry.year + "</span>",
        "</div>"
      ].join("");
    }).join("");

    booksPerYearChart.innerHTML = markup;
  }

  function getGenreCountsForSelection() {
    if (!readingState.data || !readingState.data.books) {
      return {};
    }

    var genreCounts = {};
    var selectedYear = String(readingState.selectedYear);

    readingState.data.books.forEach(function (book) {
      var bookYear = book.yearRead ? String(book.yearRead) : "";
      if (selectedYear !== "all" && bookYear !== selectedYear) {
        return;
      }

      var genreList = Array.isArray(book.genres) ? book.genres : [];
      genreList.forEach(function (genreItem) {
        var name = typeof genreItem === "string" ? genreItem : genreItem && genreItem.name;
        if (!name) {
          return;
        }

        var normalized = name.trim();
        if (!normalized) {
          return;
        }

        genreCounts[normalized] = (genreCounts[normalized] || 0) + 1;
      });
    });

    return genreCounts;
  }

  function renderGenreWordCloud() {
    if (!genreWordCloud) {
      return;
    }

    var genreCounts = getGenreCountsForSelection();
    var entries = Object.keys(genreCounts)
      .map(function (name) {
        return { name: name, count: genreCounts[name] };
      })
      .sort(function (a, b) {
        return b.count - a.count;
      })
      .slice(0, 32);

    genreWordCloud.classList.toggle("is-dense", entries.length > 0 && entries.length <= 6);

    if (!entries.length) {
      genreWordCloud.classList.add("empty");
      genreWordCloud.innerHTML = '<div class="genre-word-cloud-inner is-empty">No genres available for this selection.</div>';
      return;
    }

    genreWordCloud.classList.remove("empty");
    var maxCount = entries[0].count;
    var minCount = entries[entries.length - 1].count;
    var spread = Math.max(1, maxCount - minCount);
    var compactBoost = entries.length <= 3 ? 1.55 : entries.length <= 6 ? 1.25 : entries.length <= 10 ? 1.1 : 1;
    var minFontSize = 0.95 * compactBoost;
    var maxFontSize = (entries.length <= 4 ? 2.4 : 1.9) * compactBoost;

    var chipsMarkup = entries.map(function (entry) {
      var scale = (entry.count - minCount) / spread;
      var fontSize = minFontSize + scale * (maxFontSize - minFontSize);
      var opacity = 0.72 + scale * 0.28;
      return '<span class="genre-chip" style="font-size:' + fontSize.toFixed(2) + 'rem;opacity:' + opacity.toFixed(2) + '">' + entry.name + "</span>";
    }).join("");

    genreWordCloud.innerHTML = '<div class="genre-word-cloud-inner">' + chipsMarkup + '</div>';
  }

  function renderReadingAnalytics(data) {
    readingState.data = data;
    var allYearEntries = getAllYearEntriesFromData(data);
    var yearEntries = getYearEntriesForSelection(data);

    populateYearFilter(allYearEntries);
    renderBooksPerYearChart(yearEntries);

    renderGenreWordCloud();

    renderFavoriteBooksShelf(getFavoriteBooks());
  }

  function handleReadingLoadError() {
    if (booksPerYearChart) {
      booksPerYearChart.classList.add("empty");
      booksPerYearChart.textContent = "Unable to load weekly reading data right now.";
    }

    if (genreWordCloud) {
      genreWordCloud.classList.add("empty");
      genreWordCloud.textContent = "Genre cloud will appear once data is available.";
    }

    renderFavoriteBooksShelf(getFavoriteBooks());
  }

  function setupReadingEvents() {
    if (readingYearFilter) {
      readingYearFilter.addEventListener("change", function () {
        readingState.selectedYear = readingYearFilter.value;
        renderBooksPerYearChart(getYearEntriesForSelection(readingState.data));
        renderGenreWordCloud();
      });
    }
  }

  function loadReadingAnalytics() {
    if (!booksPerYearChart || !genreWordCloud) {
      return;
    }

    fetch("data/books.json", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Reading data fetch failed");
        }

        return response.json();
      })
      .then(function (payload) {
        if (!payload || !Array.isArray(payload.books)) {
          throw new Error("Reading payload is malformed");
        }

        renderReadingAnalytics(payload);
      })
      .catch(function () {
        handleReadingLoadError();
      });
  }

  setupReadingEvents();
  renderFavoriteBooksShelf(getFavoriteBooks());
  loadReadingAnalytics();

})();
