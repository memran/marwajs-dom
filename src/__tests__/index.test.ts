import { describe, it, expect, beforeEach } from "vitest";
import dom, { Dom, make } from "../index";

describe("dom() — core selection", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="app">
        <div class="card">
          <h3>Title</h3>
          <p class="desc">Description</p>
        </div>
        <div class="card">
          <h3>Another</h3>
          <p class="desc">More text</p>
        </div>
        <button class="btn">Click me</button>
      </div>
    `;
  });

  it("selects by id", () => {
    const $el = dom("#app");
    expect($el.length).toBe(1);
    expect($el.first).toBe(document.getElementById("app"));
  });

  it("selects by class", () => {
    expect(dom(".card").length).toBe(2);
  });

  it("selects by tag", () => {
    expect(dom("button").length).toBe(1);
  });

  it("returns empty Dom for unmatched selector", () => {
    expect(dom(".nonexistent").length).toBe(0);
  });

  it("wraps a DOM element", () => {
    const root = document.getElementById("app")!;
    expect(dom(root).length).toBe(1);
  });

  it("wraps document", () => {
    expect(dom(document).length).toBe(1);
  });

  it("wraps Element array", () => {
    const els = [document.getElementById("app")!, document.body];
    expect(dom(els).length).toBe(2);
  });
});

describe("make() — element creation", () => {
  it("creates element from HTML string", () => {
    const card = make('<div class="card"><h3>Hello</h3></div>');
    expect(card.first).toBeInstanceOf(HTMLElement);
    expect(card.first?.textContent).toBe("Hello");
  });

  it("creates element from tag name", () => {
    const btn = make("button", { id: "my-btn", type: "submit" });
    expect(btn.first?.tagName).toBe("BUTTON");
    expect((btn.first as HTMLButtonElement).type).toBe("submit");
  });

  it("creates multiple elements from HTML", () => {
    const els = make("<p>a</p><p>b</p>");
    expect(els.length).toBe(2);
  });
});

describe("Dom collection helpers", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <ul id="list">
        <li class="item">Item 1</li>
        <li class="item">Item 2</li>
        <li class="item">Item 3</li>
      </ul>
    `;
  });

  it("first returns first element", () => {
    const $items = dom(".item");
    expect(($items.first as HTMLElement).textContent).toBe("Item 1");
  });

  it("length returns count", () => {
    expect(dom(".item").length).toBe(3);
  });

  it("at returns element at index", () => {
    const $items = dom(".item");
    expect(($items.at(1) as Dom).first?.textContent).toBe("Item 2");
  });

  it("each iterates over elements", () => {
    const texts: string[] = [];
    dom(".item").each((el) => texts.push(el.textContent ?? ""));
    expect(texts).toEqual(["Item 1", "Item 2", "Item 3"]);
  });

  it("map transforms elements", () => {
    const lengths = dom(".item").map((el) => el.textContent?.length ?? 0);
    expect(lengths).toEqual([6, 6, 6]);
  });
});

describe("query methods", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <article id="root">
        <section class="section">
          <p class="text">Para 1</p>
        </section>
        <footer>
          <p class="text">Para 2</p>
          <a href="#" class="nav-link">Link</a>
        </footer>
      </article>
    `;
  });

  it("find queries descendants", () => {
    const $texts = dom("#root").find(".text");
    expect($texts.length).toBe(2);
  });

  it("near finds sibling elements", () => {
    document.body.innerHTML = `
      <div id="container">
        <span id="me">Me</span>
        <span id="target">Target</span>
        <span id="other">Other</span>
      </div>
    `;
    const $me = dom("#me");
    const $near = $me.near("#target, #other");
    expect($near.length).toBe(2);
  });

  it("up finds ancestor elements", () => {
    document.body.innerHTML = `
      <section id="parent">
        <div class="child">
          <p id="deep">Deep</p>
        </div>
      </section>
    `;
    const $p = dom("#deep");
    const $section = $p.up("section");
    expect($section.length).toBe(1);
    expect($section.first?.id).toBe("parent");
  });
});

describe("content methods", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="content">
        <p class="target">Initial text</p>
        <input class="input-field" type="text" value="default" />
      </div>
    `;
  });

  it("text() reads content", () => {
    expect(dom(".target").text()).toBe("Initial text");
  });

  it("text() writes content", () => {
    dom(".target").text("New text");
    expect(document.querySelector(".target")?.textContent).toBe("New text");
  });

  it("html() reads innerHTML", () => {
    const html = dom(".target").html();
    expect(html).toBe("Initial text");
  });

  it("html() sanitizes script tags", () => {
    dom(".target").html('<script>alert("xss")</script><p>Safe</p>');
    expect(document.querySelector(".target")?.innerHTML).toBe("<p>Safe</p>");
  });

  it("html() strips on* event handlers", () => {
    dom(".target").html('<img src="x" onerror="alert(1)">');
    const el = document.querySelector(".target");
    expect(el?.innerHTML).not.toContain("onerror");
  });

  it("val() reads input value", () => {
    expect(dom(".input-field").val()).toBe("default");
  });

  it("val() writes input value", () => {
    dom(".input-field").val("typed");
    expect(
      (document.querySelector(".input-field") as HTMLInputElement).value,
    ).toBe("typed");
  });
});

describe("attr & data methods", () => {
  beforeEach(() => {
    document.body.innerHTML = `<a id="link" href="/page" data-user-id="42" class="nav-link">Link</a>`;
  });

  it("attr() reads attribute", () => {
    expect(dom("#link").attr("href")).toBe("/page");
  });

  it("attr() writes attribute", () => {
    dom("#link").attr("target", "_blank");
    expect(document.querySelector("#link")?.getAttribute("target")).toBe(
      "_blank",
    );
  });

  it("attr() removes attribute when null", () => {
    dom("#link").attr("href", null);
    expect(document.querySelector("#link")?.hasAttribute("href")).toBe(false);
  });

  it("attr() reads null for missing attribute", () => {
    expect(dom("#link").attr("title")).toBeNull();
  });

  it("attr() with map sets multiple", () => {
    dom("#link").attr({ title: "Tooltip", rel: "nofollow" });
    const el = document.querySelector("#link") as HTMLAnchorElement;
    expect(el.title).toBe("Tooltip");
    expect(el.rel).toBe("nofollow");
  });

  it("data() writes and reads data attributes", () => {
    dom("#link").data("userId", "99");
    expect(
      (document.querySelector("#link") as HTMLElement).dataset.userId,
    ).toBe("99");
  });

  it("data() removes data attribute when null", () => {
    dom("#link").data("userId", null);
    expect(
      (document.querySelector("#link") as HTMLElement).dataset.userId,
    ).toBeUndefined();
  });
});

describe("class() method", () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="box" class="foo"></div>`;
  });

  it("adds class without prefix", () => {
    dom("#box").class("bar");
    expect(document.querySelector("#box")?.className).toBe("foo bar");
  });

  it('removes class with "!" prefix', () => {
    dom("#box").class("!foo");
    expect(document.querySelector("#box")?.className).toBe("");
  });

  it('toggles class with "?" prefix', () => {
    dom("#box").class("?bar");
    expect(document.querySelector("#box")?.className).toBe("foo bar");
    dom("#box").class("?bar");
    expect(document.querySelector("#box")?.className).toBe("foo");
  });

  it("ignores empty token silently", () => {
    dom("#box").class("");
    expect(document.querySelector("#box")?.className).toBe("foo");
  });

  it("ignores whitespace-only token", () => {
    dom("#box").class("   ");
    expect(document.querySelector("#box")?.className).toBe("foo");
  });

  it("trims token before applying", () => {
    dom("#box").class("  baz  ");
    expect(document.querySelector("#box")?.className).toBe("foo baz");
  });
});

describe("css & style methods", () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="box" style="color: red"></div>`;
  });

  it("css() writes style", () => {
    dom("#box").css("fontSize", 16);
    expect((document.querySelector("#box") as HTMLElement).style.fontSize).toBe(
      "16px",
    );
  });

  it("css() writes multiple styles", () => {
    dom("#box").css({ padding: 12, margin: "8px" });
    const el = document.querySelector("#box") as HTMLElement;
    expect(el.style.padding).toBe("12px");
    expect(el.style.margin).toBe("8px");
  });

  it("css() removes style when null", () => {
    dom("#box").css("color", null);
    expect((document.querySelector("#box") as HTMLElement).style.color).toBe(
      "",
    );
  });

  it("show() removes display:none", () => {
    (document.querySelector("#box") as HTMLElement).style.display = "none";
    dom("#box").show();
    expect((document.querySelector("#box") as HTMLElement).style.display).toBe(
      "",
    );
  });

  it("hide() sets display:none", () => {
    dom("#box").hide();
    expect((document.querySelector("#box") as HTMLElement).style.display).toBe(
      "none",
    );
  });

  it("flip() toggles hidden attribute", () => {
    const el = document.querySelector("#box") as HTMLElement;
    dom("#box").flip();
    expect(el.hidden).toBe(true);
    dom("#box").flip();
    expect(el.hidden).toBe(false);
  });

  it("flip(true) shows, flip(false) hides via style", () => {
    const el = document.querySelector("#box") as HTMLElement;
    dom("#box").flip(true);
    expect(el.hidden).toBe(false);
    dom("#box").flip(false);
    expect(el.style.display).toBe("none");
  });
});

describe("tree operations", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="parent">
        <div id="first">First</div>
        <div id="middle">Middle</div>
        <div id="last">Last</div>
      </div>
      <div id="orphan">Orphan</div>
    `;
  });

  it("add() appends children", () => {
    const $orphan = dom("#orphan");
    dom("#parent").add($orphan);
    expect(document.querySelector("#parent")?.lastElementChild?.id).toBe(
      "orphan",
    );
  });

  it("pre() prepends children", () => {
    const $orphan = dom("#orphan");
    dom("#parent").pre($orphan);
    expect(document.querySelector("#parent")?.firstElementChild?.id).toBe(
      "orphan",
    );
  });

  it("before() inserts before each element", () => {
    const $marker = make('<div id="before-mid">Before</div>');
    dom("#middle").before($marker);
    expect(document.querySelector("#first")?.nextElementSibling?.id).toBe(
      "before-mid",
    );
  });

  it("after() inserts after each element", () => {
    const $marker = make('<div id="after-mid">After</div>');
    dom("#middle").after($marker);
    expect(document.querySelector("#middle")?.nextElementSibling?.id).toBe(
      "after-mid",
    );
  });

  it("wrap() wraps with a single tag element", () => {
    dom("#middle").wrap("section");
    const section = document.querySelector("#middle")?.parentElement;
    expect(section?.tagName).toBe("SECTION");
  });

  it("wrap() rejects HTML strings", () => {
    dom("#middle").wrap("<div><span></span></div>");
    expect(document.getElementById("middle")?.parentElement?.id).toBe("parent");
  });

  it("empty() clears innerHTML", () => {
    dom("#parent").empty();
    expect(document.querySelector("#parent")?.innerHTML).toBe("");
  });

  it("rm() removes elements", () => {
    dom("#middle").rm();
    expect(document.querySelector("#middle")).toBeNull();
  });

  it("clone() creates copies", () => {
    const clones = dom("#middle").clone();
    expect(clones.length).toBe(1);
    expect(clones.first).not.toBe(document.querySelector("#middle"));
    expect(clones.first?.textContent).toBe("Middle");
  });
});

describe("event methods", () => {
  beforeEach(() => {
    document.body.innerHTML = `<button id="btn">Click</button><div id="outer"><div id="inner"></div></div>`;
  });

  it("on() attaches event listener", () => {
    let clicked = false;
    dom("#btn").on("click", () => {
      clicked = true;
    });
    (document.querySelector("#btn") as HTMLButtonElement).click();
    expect(clicked).toBe(true);
  });

  it("off() removes event listener", () => {
    let count = 0;
    const handler = () => {
      count++;
    };
    dom("#btn").on("click", handler);
    (document.querySelector("#btn") as HTMLButtonElement).click();
    dom("#btn").off("click", handler);
    (document.querySelector("#btn") as HTMLButtonElement).click();
    expect(count).toBe(1);
  });

  it("off() removes all listeners of type", () => {
    let count = 0;
    dom("#btn").on("click", () => {
      count++;
    });
    dom("#btn").on("click", () => {
      count++;
    });
    (document.querySelector("#btn") as HTMLButtonElement).click();
    dom("#btn").off("click");
    (document.querySelector("#btn") as HTMLButtonElement).click();
    expect(count).toBe(2);
  });

  it("once() fires only once", () => {
    let count = 0;
    dom("#btn").once("click", () => {
      count++;
    });
    (document.querySelector("#btn") as HTMLButtonElement).click();
    (document.querySelector("#btn") as HTMLButtonElement).click();
    expect(count).toBe(1);
  });

  it("onD() handles delegated events", () => {
    let captured = false;
    dom("#outer").onD("click", "#inner", () => {
      captured = true;
    });
    (document.querySelector("#inner") as HTMLElement).click();
    expect(captured).toBe(true);
  });
});

describe("scroll methods", () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="scroller" style="height: 100px; overflow: auto;"><div style="height: 200px;">Scroll me</div></div>`;
  });

  it("top() reads scrollTop", () => {
    const scroller = document.querySelector("#scroller") as HTMLElement;
    scroller.scrollTop = 50;
    expect(dom("#scroller").top()).toBe(50);
  });

  it("top() writes scrollTop", () => {
    dom("#scroller").top(75);
    expect((document.querySelector("#scroller") as HTMLElement).scrollTop).toBe(
      75,
    );
  });

  it("left() reads scrollLeft", () => {
    const scroller = document.querySelector("#scroller") as HTMLElement;
    scroller.scrollLeft = 30;
    expect(dom("#scroller").left()).toBe(30);
  });

  it("left() writes scrollLeft", () => {
    dom("#scroller").left(20);
    expect(
      (document.querySelector("#scroller") as HTMLElement).scrollLeft,
    ).toBe(20);
  });
});

describe("iterator", () => {
  it("supports for...of iteration", () => {
    document.body.innerHTML = `<p>a</p><p>b</p><p>c</p>`;
    const items: string[] = [];
    for (const el of dom("p")) {
      items.push(el.textContent ?? "");
    }
    expect(items).toEqual(["a", "b", "c"]);
  });
});
