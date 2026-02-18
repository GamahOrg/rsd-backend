export type duration = {
  type: string;
  operator?: string; // e.g., "AND", "OR"
  from?: {
    date: Date | string;
    operator?: string; // e.g., "<=", ">=", "="
  };
  to: {
    date: Date | string;
    operator?: string; // e.g., "<=", ">=", "="
  };
};

export type DurationParam = number | string;

export type DurationCondResult = {
  clause: string;
  params: DurationParam[];
  nextParamIndex: number;
};

export const generateDurationCond = (
  duration: duration,
  startParamIndex = 0,
  weekColumnName: string,
): DurationCondResult => {
  let whereCond = "";
  const params: DurationParam[] = [];
  let paramIndex = startParamIndex;

  // If both from and to are provided — use the combined range logic
  if (duration.from?.date && duration.to?.date) {
    const fromObj = getDurationFilterObj(
      duration.type,
      new Date(duration.from.date),
      weekColumnName,
    );
    const toObj = getDurationFilterObj(duration.type, new Date(duration.to.date), weekColumnName);

    const yearFrom = fromObj.YearNumber;
    const yearTo = toObj.YearNumber;

    const unitKey =
      duration.type === "WEEK"
        ? weekColumnName
        : duration.type === "MONTH"
          ? "MonthNumber"
          : duration.type === "QUARTER"
            ? "QuarterNumber"
            : "YearNumber";

    const unitFrom = fromObj[unitKey];
    const unitTo = toObj[unitKey];

    if (unitFrom == null || unitTo == null)
      return { clause: "", params: [], nextParamIndex: paramIndex };

    if (!duration.operator) {
      if (duration.type === "YEAR") {
        const p0 = paramIndex++;
        const p1 = paramIndex++;
        whereCond = `(YearNumber ${duration.from?.operator ?? ">="} @${p0} AND YearNumber ${duration.to?.operator ?? "<="} @${p1})`;
        params.push(yearFrom);
        params.push(yearTo);
      } else {
        const p1 = paramIndex++;
        const p2 = paramIndex++;
        const p3 = paramIndex++;
        const p4 = paramIndex++;
        const p5 = paramIndex++;
        const p6 = paramIndex++;

        whereCond = `(
    (YearNumber > @${p1} OR (YearNumber = @${p2} AND ${unitKey} >= @${p3}))
    AND 
    (YearNumber < @${p4} OR (YearNumber = @${p5} AND ${unitKey} <= @${p6}))
  )`;

        params.push(yearFrom, yearFrom, unitFrom, yearTo, yearTo, unitTo);
      }
    } else {
      const p1 = paramIndex++;
      const p2 = paramIndex++;
      whereCond = `YearNumber IN (@${p1}, @${p2})`;
      params.push(yearFrom, yearTo);
      if (duration.type != "YEAR") {
        const p3 = paramIndex++;
        const p4 = paramIndex++;
        whereCond += ` ${duration.operator} ${unitKey} IN (@${p3}, @${p4})`;
        params.push(unitFrom, unitTo);
      }
    }

    return { clause: whereCond.trim(), params, nextParamIndex: paramIndex };
  }

  if (duration.to || duration.from) {
    const dateObj = duration.to || duration.from;
    const date = getDurationFilterObj(duration.type, new Date(dateObj!.date), weekColumnName);
    Object.keys(date).forEach((key) => {
      const value = date[key as keyof typeof date];
      if (value) {
        const pIdx = paramIndex++;
        whereCond += ` ${whereCond.length > 0 ? "AND " : ""}${key} ${
          key === "YearNumber" && duration.type != "YEAR" ? "=" : (dateObj!.operator ?? "=")
        } @${pIdx}`;
        params.push(value);
      }
    });
  }

  return { clause: whereCond.trim(), params, nextParamIndex: paramIndex };
};

export const getDurationFilterObj = (type: string, date: Date, weekColumnName: string) => {
  const dateValue = new Date(date);
  return {
    YearNumber: dateValue.getFullYear(),
    MonthNumber: type === "MONTH" ? dateValue.getMonth() + 1 : undefined,
    [weekColumnName]: type === "WEEK" ? getWeekOfYear(dateValue) : undefined,
    QuarterNumber: type === "QUARTER" ? Math.floor(dateValue.getMonth() / 3) + 1 : undefined,
  };
};

export const getWeekOfYear = (date: Date): number => {
  const firstJan = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - firstJan.getTime()) / (24 * 60 * 60 * 1000)) + 1;

  const janFirstDay = firstJan.getDay() || 7;
  return Math.ceil((dayOfYear + janFirstDay - 1) / 7);
};
