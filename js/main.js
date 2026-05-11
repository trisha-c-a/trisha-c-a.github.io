(function () {
  var root = document.documentElement;
  var themeToggle = document.getElementById("themeToggle");
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".top-nav a"));
  var sections = Array.prototype.slice.call(document.querySelectorAll("main section[id]"));


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
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var nextTheme = getCurrentTheme() === "dark" ? "light" : "dark";
      setTheme(nextTheme);
    });
  }

  applyThemeUI(getCurrentTheme());
  markActiveLink();
  window.addEventListener("scroll", markActiveLink, { passive: true });

  // Experience tab switching
  var expTabs = Array.prototype.slice.call(document.querySelectorAll(".exp-company-btn"));
  var expPanels = Array.prototype.slice.call(document.querySelectorAll(".exp-panel"));
  var projectsCarousel = document.querySelector("[data-projects-carousel]");
  var projectsTrack = projectsCarousel ? projectsCarousel.querySelector(".projects-track") : null;
  var projectsPrevButton = projectsCarousel ? projectsCarousel.querySelector("[data-projects-prev]") : null;
  var projectsNextButton = projectsCarousel ? projectsCarousel.querySelector("[data-projects-next]") : null;
  var projectRotationTimer = null;
  var projectIsAnimating = false;
  var projectTransitionFallbackTimer = null;
  var PROJECT_ROTATION_DELAY = 4500;

  function switchExpTab(index) {
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

})();
