/* ===================================================================
   DRAWERS + BOTTOM DOCK
   Every section is a collapsible drawer. The dock at the bottom of the
   screen opens and closes them, tracks scroll, and takes you back up.
   =================================================================== */
(function () {
  "use strict";

  var RING_LENGTH = 100.53; // 2πr for r=16

  var reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  var scrollBehavior = reducedMotion ? "auto" : "smooth";

  var drawers = Array.prototype.slice.call(document.querySelectorAll(".drawer"));
  if (!drawers.length) return;

  var dockItems = Array.prototype.slice.call(
    document.querySelectorAll(".dock__item")
  );
  var dockAll = document.getElementById("dock-all");
  var dockTop = document.getElementById("dock-top");
  var ring = document.getElementById("dock-ring");
  var progressBar = document.getElementById("scroll-progress");

  function findDrawer(id) {
    for (var i = 0; i < drawers.length; i++) {
      if (drawers[i].id === id) return drawers[i];
    }
    return null;
  }

  function isOpen(drawer) {
    return drawer.classList.contains("drawer--open");
  }

  function syncDock() {
    dockItems.forEach(function (item) {
      var drawer = findDrawer(item.getAttribute("data-target"));
      var open = !!drawer && isOpen(drawer);
      item.classList.toggle("dock__item--open", open);
      item.setAttribute("aria-pressed", String(open));
    });

    if (dockAll) {
      var allOpen = drawers.every(isOpen);
      dockAll.setAttribute("data-state", allOpen ? "open" : "closed");
      dockAll.setAttribute(
        "aria-label",
        allOpen ? "Collapse all sections" : "Expand all sections"
      );
    }
  }

  function setDrawer(drawer, open, options) {
    var settings = options || {};
    drawer.classList.toggle("drawer--open", open);

    var head = drawer.querySelector(".drawer__head");
    if (head) head.setAttribute("aria-expanded", String(open));

    if (open && settings.scroll) {
      window.requestAnimationFrame(function () {
        drawer.scrollIntoView({ behavior: scrollBehavior, block: "start" });
      });
    }

    if (!settings.silent) syncDock();
  }

  function toggleDrawer(drawer, options) {
    setDrawer(drawer, !isOpen(drawer), options);
  }

  /* ----- Drawer headers ----- */
  drawers.forEach(function (drawer) {
    var head = drawer.querySelector(".drawer__head");
    if (!head) return;

    head.addEventListener("click", function () {
      // Opening scrolls the header to the top; closing stays put.
      toggleDrawer(drawer, { scroll: !isOpen(drawer) });
    });
  });

  /* ----- Dock ----- */
  dockItems.forEach(function (item) {
    item.addEventListener("click", function () {
      var drawer = findDrawer(item.getAttribute("data-target"));
      if (!drawer) return;

      if (isOpen(drawer)) {
        setDrawer(drawer, false);
      } else {
        setDrawer(drawer, true, { scroll: true });
      }
    });
  });

  if (dockAll) {
    dockAll.addEventListener("click", function () {
      var shouldOpen = !drawers.every(isOpen);
      drawers.forEach(function (drawer) {
        setDrawer(drawer, shouldOpen, { silent: true });
      });
      syncDock();
    });
  }

  if (dockTop) {
    dockTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: scrollBehavior });
    });
  }

  /* ----- Scroll: progress bar, ring, current-section dot ----- */
  var ticking = false;

  function updateOnScroll() {
    var scrollY = window.scrollY || window.pageYOffset;
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = maxScroll > 0 ? Math.min(1, scrollY / maxScroll) : 0;

    if (progressBar) progressBar.style.width = ratio * 100 + "%";
    if (ring) {
      ring.style.strokeDashoffset = String(RING_LENGTH * (1 - ratio));
    }

    var currentId = "";
    drawers.forEach(function (drawer) {
      if (drawer.getBoundingClientRect().top <= 140) currentId = drawer.id;
    });

    dockItems.forEach(function (item) {
      item.classList.toggle(
        "dock__item--current",
        item.getAttribute("data-target") === currentId
      );
    });

    ticking = false;
  }

  function requestScrollUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateOnScroll);
  }

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate);

  /* ----- Initial state: every drawer starts closed; only a #hash opens one ----- */
  drawers.forEach(function (drawer) {
    setDrawer(drawer, false, { silent: true });
  });

  var hashId = window.location.hash.replace("#", "");
  var hashDrawer = hashId ? findDrawer(hashId) : null;

  if (hashDrawer) {
    setDrawer(hashDrawer, true, { silent: true });
    window.requestAnimationFrame(function () {
      hashDrawer.scrollIntoView({ behavior: "auto", block: "start" });
    });
  }

  syncDock();
  updateOnScroll();

  /* ===== App search & platform filter (inside drawer 04) ===== */
  var grid = document.getElementById("apps-grid");
  var searchInput = document.getElementById("apps-search");
  var countEl = document.getElementById("apps-count");
  var emptyEl = document.getElementById("apps-empty");
  var resetBtn = document.getElementById("apps-reset");
  var chips = Array.prototype.slice.call(
    document.querySelectorAll(".filter-chip")
  );
  var resetFilters = null;

  if (grid && searchInput) {
    var entries = Array.prototype.slice
      .call(grid.querySelectorAll(".project-card"))
      .map(function (card) {
        var platforms = [];

        Array.prototype.slice
          .call(card.querySelectorAll(".store-link"))
          .forEach(function (link) {
            var store = link.getAttribute("data-store");
            if (store) platforms.push(store);
          });

        if (card.querySelector(".project-card__title a")) {
          platforms.push("website");
        }

        return {
          card: card,
          text: card.textContent.toLowerCase().replace(/\s+/g, " "),
          platforms: platforms,
        };
      });

    var total = entries.length;
    var activeFilter = "all";

    var applyFilters = function () {
      var query = searchInput.value.trim().toLowerCase();
      var visible = 0;

      entries.forEach(function (entry) {
        var matchesQuery = !query || entry.text.indexOf(query) > -1;
        var matchesFilter =
          activeFilter === "all" || entry.platforms.indexOf(activeFilter) > -1;
        var show = matchesQuery && matchesFilter;

        entry.card.hidden = !show;
        if (show) visible += 1;
      });

      if (countEl) {
        countEl.textContent =
          visible === total ? total + " apps" : visible + " of " + total + " apps";
      }

      if (emptyEl) emptyEl.hidden = visible !== 0;
    };

    resetFilters = function () {
      searchInput.value = "";
      activeFilter = "all";
      chips.forEach(function (chip) {
        var isAll = chip.getAttribute("data-filter") === "all";
        chip.classList.toggle("filter-chip--active", isAll);
        chip.setAttribute("aria-pressed", String(isAll));
      });
      applyFilters();
    };

    searchInput.addEventListener("input", applyFilters);

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        activeFilter = chip.getAttribute("data-filter") || "all";
        chips.forEach(function (other) {
          var isActive = other === chip;
          other.classList.toggle("filter-chip--active", isActive);
          other.setAttribute("aria-pressed", String(isActive));
        });
        applyFilters();
      });
    });

    if (resetBtn) resetBtn.addEventListener("click", resetFilters);
  }

  /* ===== Keyboard shortcuts ===== */
  document.addEventListener("keydown", function (event) {
    var typing =
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement;

    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (event.key === "Escape" && typing && searchInput && resetFilters) {
      resetFilters();
      searchInput.blur();
      return;
    }

    if (typing) return;

    // 1–6 toggle the matching drawer
    var digit = parseInt(event.key, 10);
    if (digit >= 1 && digit <= dockItems.length) {
      event.preventDefault();
      dockItems[digit - 1].click();
      return;
    }

    var key = event.key.toLowerCase();

    if (key === "a" && dockAll) {
      event.preventDefault();
      dockAll.click();
      return;
    }

    if (key === "t" && dockTop) {
      event.preventDefault();
      dockTop.click();
      return;
    }

    if (event.key === "/" && searchInput) {
      event.preventDefault();
      var appsDrawer = findDrawer("apps");
      if (appsDrawer && !isOpen(appsDrawer)) {
        setDrawer(appsDrawer, true, { scroll: true });
      }
      window.setTimeout(
        function () {
          searchInput.focus();
          searchInput.select();
        },
        reducedMotion ? 0 : 320
      );
    }
  });
})();
