using Ivy;
using Ivy.Widgets.ActivityHeatmap;

var server = new Server();
server
    .UseHotReload()
    .AddApp<ActivityHeatmapDemo>();
await server.RunAsync();

[App]
class ActivityHeatmapDemo : ViewBase
{
    private static Activity[] GenerateActivityData(int min, int max, double zeroProb = 0.4)
    {
        var rng = new Random(42);
        var today = DateOnly.FromDateTime(DateTime.Today);
        var start = today.AddDays(-364);
        return [.. Enumerable
            .Range(0, 365)
            .Select(start.AddDays)
            .Where(_ => rng.NextDouble() > zeroProb)
            .Select(d => new Activity { Date = d, Count = rng.Next(min, max) })];
    }
    public override object Build()
    {
        var client = UseService<IClientProvider>();

        var selectedColor = UseState(Colors.Emerald);
        var showDayLabels = UseState(false);
        var showMonthLabels = UseState(false);
        var nullableRange = UseState<(DateOnly?, DateOnly?)>(() =>
            (DateOnly.FromDateTime(DateTime.Today.AddDays(-364)),
             DateOnly.FromDateTime(DateTime.Today)));
        var startDate = nullableRange.Value.Item1;
        var endDate = nullableRange.Value.Item2;

        var rng = new Random(42);
        var today = DateOnly.FromDateTime(DateTime.Today);
        var start = today.AddDays(-364);
        var data = Enumerable
            .Range(0, 365)
            .Select(start.AddDays)
            .Where(_ => rng.NextDouble() > 0.4)
            .Select(d => new Activity { Date = d, Count = rng.Next(1, 20) })
            .ToArray();

        return Layout
            .Vertical()
            .Gap(4)
            .Width(Size.Auto().At(Breakpoint.Tablet).And(Breakpoint.Desktop, Size.Fit()))

            | Text.H1("ActivityHeatmap")
            | Text.H2("Basic Usage")
            | new CodeBlock(@$"public class ActivityHeatmapDemo : ViewBase
{{
    public override object Build()
    {{
        var rng = new Random(42);
        var today = DateOnly.FromDateTime(DateTime.Today);
        var start = today.AddDays(-364);

        Activity[] data = Enumerable
            .Range(0, 365)
            .Select(start.AddDays)
            .Where(_ => rng.NextDouble() > 0.4)
            .Select(d => new Activity {{ Date = d, Count = rng.Next(1, 20) }})
            .ToArray();

        return new ActivityHeatmap().Data(data);
    }}
}}", Languages.Csharp)
            | (Layout
                .Vertical()
                .Gap(2)
                .Padding(4)
                .BottomMargin(16)
                .BorderThickness(1)
                .BorderRadius(BorderRadius.Rounded)
                | new ActivityHeatmap().Data(GenerateActivityData(1, 20)))

            | Text.H2("With Optional Properties:")
            | new CodeBlock(@$"new ActivityHeatmap()
    .Data(data)
    .ShowDayLabels({showDayLabels.Value.ToString().ToLower()})
    .ShowMonthLabels({showMonthLabels.Value.ToString().ToLower()})
    .StartDate(DateOnly.Parse({$"\"{startDate}\""}))
    .EndDate(DateOnly.Parse({$"\"{endDate}\""}))
    .ColorScheme(Colors.{selectedColor.Value})
    .OnDayClick(day => Console.WriteLine(...));", Languages.Csharp)

            | (Layout
                .Horizontal()
                .Gap(2)
                | (Layout.Horizontal().Gap(2).Width(Size.Fit())
                    | selectedColor.ToColorInput().Variant(ColorInputVariant.SwatchPicker)
                    | Text.P(selectedColor.Value.ToString()))
                | (Layout.Horizontal().Gap(2).Width(Size.Grow())
                    | showDayLabels.ToBoolInput().Label("Show day labels")
                    | showMonthLabels.ToBoolInput().Label("Show month labels"))
                | nullableRange.ToDateRangeInput())

            | (Layout
                .Vertical()
                .Gap(2)
                .Padding(4)
                .BottomMargin(16)
                .BorderThickness(1)
                .BorderRadius(BorderRadius.Rounded)
                | new ActivityHeatmap()
                    .Data(GenerateActivityData(1, 20))
                    .StartDate(startDate)
                    .EndDate(endDate)
                    .ColorScheme(selectedColor.Value)
                    .ShowDayLabels(showDayLabels.Value)
                    .ShowMonthLabels(showMonthLabels.Value)
                    .OnDayClick(day => Console.WriteLine($"Clicked {day.Date}: {day.Count}")))

            | Text.H2("With Bipolar Color Scheme:")
            | new CodeBlock(@$"new ActivityHeatmap()
.Data(data)
.ColorScheme([Colors.Blue, Colors.Red])
.OnDayClick(day => Console.WriteLine(...));", Languages.Csharp)
            | new ActivityHeatmap()
                .Data(GenerateActivityData(-100, 100, 0.1))
                .ColorScheme([Colors.Blue, Colors.Red])

            | new DropDownMenu(@evt =>
                {
                    ThemeMode selectedTheme = @evt.Value switch
                    {
                        "Light" => ThemeMode.Light,
                        "Dark" => ThemeMode.Dark,
                        _ => ThemeMode.System,
                    };
                    client.SetThemeMode(selectedTheme);
                },
                new Button("Theme").Variant(ButtonVariant.Link).Icon(Icons.SunMoon),
                MenuItem.Default("Light").Icon(Icons.Sun),
                MenuItem.Default("Dark").Icon(Icons.Moon),
                MenuItem.Default("System").Icon(Icons.Computer));
    }
}